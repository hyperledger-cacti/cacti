#![cfg_attr(not(feature = "std"), no_std)]
#![feature(in_band_lifetimes)]

use ink_lang as ink;

#[ink::contract(dynamic_storage_allocator = true)]
mod public_bulletin {

    /// A commitment is a (View, RollingHash) tuple, where a View represents a permissioned blockchain's transaction receipt, and a RollingHash contains the history of past Views
    type Commitment = (String, [u8; 32]);

    use ink_prelude::string::String;
    use ink_prelude::string::ToString;
    use ink_prelude::format;
    use ink_env::hash::{Sha2x256, HashOutput};
    use ink_storage::traits::PackedLayout;
    use ink_storage::{collections::HashMap as HashMap, alloc::Box as StorageBox, collections::Vec as Vec};
    use ink_env::{AccountId as InkAccountId};

    #[ink(event)]
    /// Emitted when a view is published
    pub struct ViewPublished {
        id: i32,
        member: InkAccountId,
        view: String,
    }

    #[ink(event)]
    /// Emitted when there is no consensus on a view
    pub struct ViewConflict {
        id: i32,
        member: InkAccountId,
        view: String,
        rolling_hash: [u8; 32],
    }

    #[ink(event)]
    /// Emitted when there is a view that needs to be approved
    pub struct ViewApprovalRequest {
        id: i32,
        member: InkAccountId,
        view: String,
    }

    #[ink(storage)]
    /// Contains the storage of the PublicBulletin
    pub struct PublicBulletin {
        /// Each member is associated with several ids, and each id is associated with a commitment
        commitments_per_member: HashMap<InkAccountId, StorageBox<HashMap<i32, Commitment>>>,
        /// Each member is associated with several ids, and each id is associated with the evaluations of other members for that commitment
        replies_per_member: HashMap<InkAccountId, StorageBox<HashMap<i32, StorageBox<Vec<String>>>>>,
        /// Account ID's which correspond to the committee members of the blockchain
        whitelist: Vec<InkAccountId>,
        /// The current block height of the blockchain
        current_height: u32,
        /// While waiting for a quorum of replies, the timeout is the number of new blocks we can wait for before cancelling and rolling back
        timeout: u32,
    }
    {itemize}
    impl PublicBulletin {

        #[ink(constructor)]
        pub fn constructor(height: u32) -> Self {
            Self {
                commitments_per_member: HashMap::new(),
                replies_per_member: HashMap::new(),
                whitelist: Vec::new(),
                current_height: height,
                timeout: u32::default(),
            }
        }

        /// Set the timeout to a new value
        #[ink(message)]
        pub fn set_timeout(&mut self, timeout: u32){
            if self.env().caller() == InkAccountId::default() {
                self.timeout = timeout;
            }
        }

        /// Increment the current block height
        #[ink(message)]
        pub fn increment_cur_height(&mut self){
            if self.env().caller() == InkAccountId::default() {
                self.current_height += 1;
            }
        }

        /// Add a committee member to this contract
        #[ink(message)]
        pub fn add_member(&mut self, member: InkAccountId) {
            if self.env().caller() == InkAccountId::default() && !(self.check_contains(&self.whitelist, &member)) {
                self.whitelist.push(member.clone());
                self.commitments_per_member.insert(member.clone(), StorageBox::new(HashMap::new()));
                self.replies_per_member.insert(member.clone(), StorageBox::new(HashMap::new()));
            }
        }

        /// Remove a member from this contract
        #[ink(message)]
        pub fn remove_member(&mut self, member: InkAccountId) {
            if self.env().caller() == InkAccountId::default() && self.check_contains(&self.whitelist, &member) {
                let index = self.whitelist.iter().position(|x| x == &member).unwrap();
                self.whitelist.swap_remove_drop(index as u32);
                self.commitments_per_member.take(&member);
                self.replies_per_member.take(&member);
            }
        }

        /// Publish a given commitment (with a given id) in the public bulletin and announce it to the network
        #[ink(message)]
        pub fn publish_view(&mut self, id: i32, view: String, rolling_hash: [u8; 32]) {
            let caller = self.env().caller();
            // Check if the account that wants to publish a view is actually a member of the permissioned blockchain
            if self.check_contains(&self.whitelist, &caller) {
                // Verify if this member has not already published a view with this id in the past
                if !(self.commitments_per_member.get(&caller).unwrap().get(&id).is_some()) {
                    let mut published = false;
                    let commitments: Vec<Commitment> = self.get_all_commitments(id);

                    // This view must be equal to any published view with this id (if they exist)
                    if !(commitments.is_empty()) {
                        // If the view is different than the established view for this id, it is not published and conflict arises
                        if view != (commitments.get(0).unwrap()).0 {
                            return self.report_conflict(id, view, rolling_hash);
                        } else {
                            // If the provided rolling hash is correct, we add and publish the view
                            if self.calculate_rolling_hash(id.clone()) == rolling_hash {
                                self.add_and_publish_view(id.clone(), view.clone(), rolling_hash.clone());
                                published = true;
                                // Else, the view is not published and a conflict arises
                            } else {
                                return self.report_conflict(id, view, rolling_hash);
                            }
                        }
                    }

                    // In case the view is the first with this id, it has to be approved by the member committee to be published
                    if !published && self.approve_view(id.clone(), view.clone(), rolling_hash.clone()) && self.calculate_rolling_hash(id.clone()) == rolling_hash {
                        self.add_and_publish_view(id.clone(), view.clone(), rolling_hash.clone());
                    }
                }
            }
        }

        /// Approve a commitment or rise a conflict for it, depending on the committee members' evaluation
        fn approve_view(&mut self, id: i32, view: String, rolling_hash: [u8; 32]) -> bool {
            let caller = self.env().caller();
            let member_replies = self.replies_per_member.get_mut(&caller).unwrap();

            // Initialize reply vector for this id and member
            if member_replies.get(&id).is_none() {
                member_replies.insert(id, StorageBox::new(Vec::new()));
            }

            // Emit event to request the committee members to approve a commitment with a given id and member
            self.env().emit_event(ViewApprovalRequest {
                id: id.clone(),
                member: caller.clone(),
                view: view.clone(),
            });

            // Block thread until getting a number of replies equal to the size of the quorum for the current committee members.
            // We trust that we will always have at least this amount of replies, hence that this loop will never be infinite
            let initial_height = self.current_height.clone();
            while !(self.get_all_replies(&id).len() == self.calculate_quorum()) {
                // If the operation times out, the existing replies are rolled back and the view will not be published
                if self.current_height >= (initial_height + self.timeout.clone()) {
                    self.replies_per_member.get_mut(&caller).unwrap().take(&id);
                    return false
                }
            }


            // After getting all replies, if at least one member does not approve the view, a view conflict arises and it's not published
            if self.check_contains(&self.get_all_replies(&id), &String::from("NOK")) {
                self.report_conflict(id.clone(), view, rolling_hash);
                return false
            }
            // If all members approve the view, it is published
            return true
        }

        /// A committee member calls this function to approve or reject a given view
        #[ink(message)]
        pub fn evaluate_view(&mut self, id: i32, evaluated_member: InkAccountId, verdict: String) {
            // Check if the account that wants to evaluate a view is actually a member of the blockchain
            if self.check_contains(&self.whitelist, &(self.env().caller())) {
                self.replies_per_member.get_mut(&evaluated_member).unwrap().get_mut(&id).unwrap().push(verdict);
            }
        }

        /// Report a conflict for a given commitment
        #[ink(message)]
        pub fn report_conflict(&self, id: i32, view: String, rolling_hash: [u8; 32]) {
            let caller = self.env().caller();
            // Check if this account is actually a member of the blockchain
            if self.check_contains(&self.whitelist, &caller) {
                self.env().emit_event(ViewConflict {
                    id,
                    member: caller.clone(),
                    view: view.clone(),
                    rolling_hash: rolling_hash.clone(),
                });
            }
        }

        /// Aux: Add a commitment to the Public Bulletin and emit an event to announce this to the network
        fn add_and_publish_view(&mut self, id: i32, view: String, rolling_hash: [u8; 32]) {
            let caller = self.env().caller();
            self.commitments_per_member.get_mut(&caller).unwrap().insert(id, (view.clone(), rolling_hash.clone()));
            self.env().emit_event(ViewPublished {
                id: id.clone(),
                member: caller.clone(),
                view: view.clone(),
            });
        }

        /// Aux: Check if vector contains a given element
        fn check_contains<T: PackedLayout + PartialEq>(&self, vec: &Vec<T>, element: &T) -> bool {
            let mut res = false;
            for acc in vec.iter(){
                if acc == element {
                    res = true;
                }
            }
            res
        }

        /// Aux: Retrieve the commitments of all members for a given id
        fn get_all_commitments(&self, id: i32) -> Vec<Commitment> {
            let mut result: Vec<Commitment> = Vec::new();
            for (_, map) in self.commitments_per_member.iter() {
                let entry = map.get(&id);
                if entry.is_some() {
                    // If the commitment is not none, push it to result vector
                    result.push((entry.unwrap().0.clone(), entry.unwrap().1.clone()));
                }
            }
            result
        }

        /// Aux: Retrieve all replies for this account, for a given id
        fn get_all_replies(&self, id: &i32) -> Vec<String> {
            let mut replies: Vec<String> = Vec::new();
            let map_option = self.replies_per_member.get(&(self.env().caller())).unwrap().get(id);
            if map_option.is_some() {
                for str in map_option.unwrap().iter() {
                    replies.push(str.to_string());
                }
            }
            replies
        }

        /// Aux: Calculate quorum according to current committee members
        fn calculate_quorum(&self) -> u32 {
            let res = self.whitelist.len() / 2;
            if self.whitelist.len() <= 2 {
                res
            } else {
                res + 1
            }
        }

        /// Aux: Calculate the rolling hash for a given id and member
        fn calculate_rolling_hash(&self, id: i32) -> [u8; 32] {
            // Formula for rolling_hash: H(i) = hash(hash(V_(i-1)) || hash(H_(i-l1)))
            let previous_commitment_opt = self.commitments_per_member.get(&(self.env().caller())).unwrap().get(&(id-1));
            let res: [u8; 32];

            // The rolling hash will only be calculated in case the member has a commitment for the previous id
            if previous_commitment_opt.is_some() {
                let previous_commitment = previous_commitment_opt.unwrap();
                let previous_view = &previous_commitment.0;
                let previous_rolling_hash: &[u8; 32] = &previous_commitment.1;

                let mut output_view: [u8; 32] = <Sha2x256 as HashOutput>::Type::default();
                ink_env::hash_encoded::<Sha2x256, _>(previous_view, &mut output_view); //output_view saves hash of previous_view

                let mut output_roll: [u8; 32] = <Sha2x256 as HashOutput>::Type::default();
                ink_env::hash_bytes::<Sha2x256>(previous_rolling_hash, &mut output_roll); //output_roll saves hash of previous_rolling_hash

                let formatted_res = &format!("{}{}", String::from_utf8_lossy(&output_view), String::from_utf8_lossy(&output_roll));

                let mut output_res: [u8; 32] = <Sha2x256 as HashOutput>::Type::default();
                ink_env::hash_encoded::<Sha2x256, _>(formatted_res, &mut output_res); // output_res saves the resulting hash
                res = output_res;

            // Otherwise, the rolling hash will correspond a default array (all zeros)
            } else {
                res = [0; 32];
            }
            res
        }

        /// Get commitment of this account for a given id
        #[ink(message)]
        pub fn get_commitment(&self, id: i32) -> Commitment {
            self.commitments_per_member.get(&(self.env().caller())).unwrap().get(&id).unwrap().clone()
        }


        // ******************************* Functions for test usage ********************************


        /// Aux: Returns bool that states wether commitment with given id is published (or not)
        pub fn is_published(&self, id: i32) -> bool {
            let option = self.commitments_per_member.get(&(self.env().caller())).unwrap().get(&id);
            if option.is_none() {
                false
            } else {
                true
            }
        }

        /// Aux: Get contract owner
        fn get_owner(&self) -> InkAccountId {
            self.env().caller()
        }

        /// Aux: Get timeout
        fn get_timeout(&self) -> u32 {
            self.timeout.clone()
        }

        /// Aux: Get current block height
        fn get_cur_height(&self) -> u32 {
            self.current_height.clone()
        }

        /// Aux: Get wrapped replies for this account for a given id
        fn get_wrapped_replies(&self, id: i32) -> Option<&StorageBox<Vec<String>>> {
            let option = self.replies_per_member.get(&(self.env().caller()));
            if option.is_none() {
                None
            } else {
                let inner_option = option.unwrap().get(&id);
                if inner_option.is_none() {
                    None
                } else {
                    inner_option
                }
            }
        }

        /// Aux: Add a commitment manually, without having to publish it
        fn add_commitment_manually(&mut self, id: i32, member: &InkAccountId, view: String, rolling_hash: [u8; 32]) {
            self.commitments_per_member.get_mut(member).unwrap().insert(id, (view, rolling_hash));
        }

        /// Aux: Add a new id to the replies_per_member hashmap
        fn add_id_to_replies(&mut self, id: i32, member: &InkAccountId) {
            if self.env().caller() == InkAccountId::default() {
                self.replies_per_member.get_mut(&member).unwrap().insert(id, StorageBox::new(Vec::new()));
            }
        }

    }

    #[cfg(test)]
    mod tests {
        /// Imports definitions from the outer scope so we can use them here.
        use super::*;

        use ink_lang as ink;
        use ink_env::AccountId;

        #[ink::test]
        fn whitelist_works() {
            let mut public_bulletin_sc = PublicBulletin::constructor(0);
            let bob = InkAccountId::from([0x1; 32]);
            let rolling_hash: [u8; 32] = [0; 32];

            // Set special account as caller to add a member. This is the only account with permission to perform this action
            set_caller_id(InkAccountId::default());
            public_bulletin_sc.add_member(bob);

            set_caller_id(bob);
            public_bulletin_sc.publish_view(1, String::from("TryAddView"), rolling_hash);
            assert_eq!(public_bulletin_sc.is_published(1), true);
            public_bulletin_sc.remove_member(bob);
            public_bulletin_sc.publish_view(2, String::from("TryAddOtherView"), rolling_hash.clone());
            assert_eq!(public_bulletin_sc.is_published(2), false);
        }

        #[ink::test]
        fn pre_existing_view_correct_hash() {
            let mut public_bulletin_sc = PublicBulletin::constructor(0);
            let bob = InkAccountId::from([0x1; 32]);
            let alice = InkAccountId::from([0x2; 32]);
            let rolling_hash: [u8; 32] = [0; 32];

            // Set special account as caller to add members
            set_caller_id(InkAccountId::default());
            public_bulletin_sc.add_member(bob);
            public_bulletin_sc.add_member(alice);

            public_bulletin_sc.add_commitment_manually(1, &alice, String::from("TestEqualViews"), rolling_hash);

            set_caller_id(bob);
            public_bulletin_sc.publish_view(1, String::from("TestEqualViews"), rolling_hash.clone());
            assert_eq!(public_bulletin_sc.is_published(1), true);
        }


        #[ink::test]
        fn pre_existing_view_incorrect_hash() {
            let mut public_bulletin_sc = PublicBulletin::constructor(0);
            let bob = InkAccountId::from([0x1; 32]);
            let alice = InkAccountId::from([0x2; 32]);
            let rolling_hash: [u8; 32] = [1; 32];

            // Set special account as caller to add members
            set_caller_id(InkAccountId::default());
            public_bulletin_sc.add_member(bob);
            public_bulletin_sc.add_member(alice);

            public_bulletin_sc.add_commitment_manually(1, &alice, String::from("TestEqualViews"), rolling_hash);

            set_caller_id(bob);
            public_bulletin_sc.publish_view(1, String::from("TestEqualViews"), rolling_hash.clone());
            assert_eq!(public_bulletin_sc.is_published(1), false);
        }


        #[ink::test]
        fn new_view_one_member() {
            let mut public_bulletin_sc = PublicBulletin::constructor(0);
            let bob = InkAccountId::from([0x1; 32]);
            let rolling_hash: [u8; 32] = [0; 32];

            // Set special account as caller to add members
            set_caller_id(InkAccountId::default());
            public_bulletin_sc.add_member(bob);

            set_caller_id(bob);
            public_bulletin_sc.publish_view(1,String::from("View"), rolling_hash);
            assert_eq!(public_bulletin_sc.is_published(1), true);
        }

        #[ink::test]
        fn new_view_two_approvals(){
            let mut public_bulletin_sc = PublicBulletin::constructor(0);
            let bob = InkAccountId::from([0x1; 32]);
            let alice = InkAccountId::from([0x2; 32]);
            let jane = InkAccountId::from([0x3; 32]);
            let rolling_hash = [0; 32];

            // Set special account as caller to add members
            set_caller_id(InkAccountId::default());
            public_bulletin_sc.add_member(bob);
            public_bulletin_sc.add_member(alice);
            public_bulletin_sc.add_member(jane);
            public_bulletin_sc.add_id_to_replies(1, &bob);

            // Note: Once the contract is deployed, the three functions below will not be called this way.
            // The 'publish_view()' function will first be called, and will announce a view approval request.
            // Then, it will wait for a given number of calls to the 'evaluate_view()' function (responses from the quorum) before it proceeds.

            set_caller_id(alice);
            public_bulletin_sc.evaluate_view(1, bob, String::from("OK"));

            set_caller_id(jane);
            public_bulletin_sc.evaluate_view(1, bob, String::from("OK"));

            set_caller_id(bob);
            public_bulletin_sc.publish_view(1, String::from("View"), rolling_hash);
            assert_eq!(public_bulletin_sc.is_published(1), true);
        }

        //
        #[ink::test]
        fn new_view_approval_and_disapproval(){
            let mut public_bulletin_sc = PublicBulletin::constructor(0);
            let bob = InkAccountId::from([0x1; 32]);
            let alice = InkAccountId::from([0x2; 32]);
            let jane = InkAccountId::from([0x3; 32]);
            let rolling_hash = [0; 32];

            // Set special account as caller to add members
            set_caller_id(InkAccountId::default());
            public_bulletin_sc.add_member(bob);
            public_bulletin_sc.add_member(alice);
            public_bulletin_sc.add_member(jane);
            public_bulletin_sc.add_id_to_replies(1, &bob);

            // Note: Once the contract is deployed, the three functions below will not be called this way.
            // The 'publish_view()' function will first be called, and will announce a view approval request.
            // Then, it will wait for a given number of calls to the 'evaluate_view()' function (responses from the quorum) before it proceeds.

            set_caller_id(alice);
            public_bulletin_sc.evaluate_view(1, bob, String::from("OK"));

            set_caller_id(jane);
            public_bulletin_sc.evaluate_view(1, bob, String::from("NOK"));

            set_caller_id(bob);
            public_bulletin_sc.publish_view(1, String::from("View"), rolling_hash);
            assert_eq!(public_bulletin_sc.is_published(1), false);
        }

        #[ink::test]
        fn new_views_timeout_expires() {
            let mut public_bulletin_sc = PublicBulletin::constructor(0);
            let bob = InkAccountId::from([0x1;32]);
            let alice = InkAccountId::from([0x2; 32]);
            let rolling_hash = [0; 32];

            set_caller_id(InkAccountId::default());
            public_bulletin_sc.add_member(bob);
            public_bulletin_sc.add_member(alice);
            public_bulletin_sc.add_id_to_replies(1, &bob);

            // Note: Once the contract is deployed, the three functions below will not be called this way.
            // The 'publish_view()' function will first be called, and will announce a view approval request.
            // Then, it will wait for a given number of calls to the 'evaluate_view()' function (responses from the quorum) before it proceeds. If it receives no replies,
            // as new blocks are added to the permissioned chain, the timeout will eventually expire thus the operation is rolled back.

            public_bulletin_sc.increment_cur_height();
            public_bulletin_sc.increment_cur_height();

            set_caller_id(bob);
            public_bulletin_sc.publish_view(1, String::from("View"), rolling_hash);
            assert_eq!(public_bulletin_sc.is_published(1), false);
            assert_eq!(public_bulletin_sc.get_wrapped_replies(1), None);
        }

        #[ink::test]
        fn two_views_correct_hash() {
            let mut public_bulletin_sc = PublicBulletin::constructor(0);
            let bob = InkAccountId::from([0x1; 32]);
            let rolling_hash_1 = [0; 32];
            let rolling_hash_2 = [127, 110, 16, 22, 213, 67, 9, 4, 204, 55, 120, 98, 222, 12, 102, 77, 130,
                146, 117, 60, 100, 17, 221, 118, 78, 71, 69, 143, 72, 244, 182, 161];

            // Set special account as caller to add member
            set_caller_id(InkAccountId::default());
            public_bulletin_sc.add_member(bob);

            set_caller_id(bob);
            public_bulletin_sc.publish_view(1, String::from("View1"), rolling_hash_1);
            public_bulletin_sc.publish_view(2, String::from("View2"), rolling_hash_2);
            assert_eq!(public_bulletin_sc.is_published(1), true);
            assert_eq!(public_bulletin_sc.is_published(2), true);
        }

        #[ink::test]
        fn two_views_incorrect_hash() {
            let mut public_bulletin_sc = PublicBulletin::constructor(0);
            let bob = InkAccountId::from([0x1; 32]);
            let rolling_hash_1 = [0; 32];
            let rolling_hash_2 = [1; 32];

            // Set special account as caller to add member
            set_caller_id(InkAccountId::default());
            public_bulletin_sc.add_member(bob);

            set_caller_id(bob);
            public_bulletin_sc.publish_view(1, String::from("View1"), rolling_hash_1);
            public_bulletin_sc.publish_view(2, String::from("View2"), rolling_hash_2);
            assert_eq!(public_bulletin_sc.is_published(1), true);
            assert_eq!(public_bulletin_sc.is_published(2), false);
        }

        #[ink::test]
        fn two_commitments_same_id_and_member() {
            let mut public_bulletin_sc = PublicBulletin::constructor(0);
            let bob = InkAccountId::from([0x1; 32]);
            let rolling_hash_1 = [0; 32];

            // Set special account as caller to add member
            set_caller_id(InkAccountId::default());
            public_bulletin_sc.add_member(bob);

            set_caller_id(bob);
            public_bulletin_sc.publish_view(1, String::from("FirstView"), rolling_hash_1);
            public_bulletin_sc.publish_view(1, String::from("TryReplaceFirst"), rolling_hash_1.clone());
            assert_eq!(public_bulletin_sc.get_commitment(1), (String::from("FirstView"), rolling_hash_1.clone()));
        }

        #[ink::test]
        fn two_different_commitments_same_id() {
            let mut public_bulletin_sc = PublicBulletin::constructor(0);
            let bob = InkAccountId::from([0x1; 32]);
            let alice = InkAccountId::from([0x2; 32]);
            let rolling_hash_1 = [0; 32];

            // Set special account as caller to add member
            set_caller_id(InkAccountId::default());
            public_bulletin_sc.add_member(bob);
            public_bulletin_sc.add_member(alice);
            public_bulletin_sc.add_id_to_replies(1, &bob);

            set_caller_id(alice);
            public_bulletin_sc.evaluate_view(1, bob, String::from("OK"));

            set_caller_id(bob);
            public_bulletin_sc.publish_view(1, String::from("FirstView"), rolling_hash_1);
            assert_eq!(public_bulletin_sc.is_published(1), true);

            set_caller_id(alice);
            public_bulletin_sc.publish_view(1, String::from("TryDifferentView"), rolling_hash_1.clone());
            assert_eq!(public_bulletin_sc.is_published(1), false);
        }

        #[ink::test]
        fn increment_height() {
            let mut public_bulletin_sc = PublicBulletin::constructor(0);

            // Set special account as caller to increment block height
            set_caller_id(InkAccountId::default());
            assert_eq!(public_bulletin_sc.get_cur_height(), 0);
            public_bulletin_sc.increment_cur_height();
            assert_eq!(public_bulletin_sc.get_cur_height(), 1);
        }

        /// Aux: Sets caller id for tests
        fn set_caller_id(account_id: InkAccountId) {
            // Get contract address
            let callee = ink_env::account_id::<ink_env::DefaultEnvironment>()
                .unwrap_or([0x0; 32].into());

            ink_env::test::push_execution_context::<ink_env::DefaultEnvironment>(
                // Set address of caller
                account_id,
                callee,
                1000000,
                1000000,
                ink_env::test::CallData::new(ink_env::call::Selector::new([0x00; 4]))
            );
        }
    }
}
