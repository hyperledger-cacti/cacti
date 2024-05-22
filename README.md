# SNU OpenCBDC Space
## Notice
* 본 Repository는 OpenCBDC를 위한 Cactus 커넥터 작업을 위해 [hyperledger/cacti](https://github.com/hyperledger/cacti)를 fork한 저장소입니다. (24년 4월 main 기준)
* 개발 환경은 'snu-v0.0.1' 단일 브랜치에 반영하는 것을 원칙으로 하며, 그 외에 main 및 다른 브랜치는 활용하지 않습니다.
* 코드 작업은 아래 명시된 디렉토리 내에서만 진행합니다. (그 외 위치 수정이 필요한 경우 별도 협의 후 진행)
  * https://github.com/dcslab-bc/cacti/tree/snu-v0.0.1/extensions/cactus-plugin-htlc-coordinator-opencbdc
  * https://github.com/dcslab-bc/cacti/tree/snu-v0.0.1/packages/cactus-plugin-ledger-connector-opencbdc
  * https://github.com/dcslab-bc/cacti/tree/snu-v0.0.1/packages/opencbdc-json-rpc-server
* 특정 함수 또는 API 구현 시, 이를 검증할 수 있는 Test 파일도 함께 개발하는 것을 권장합니다. (시간 지나서 하려면 기억이 안남)
* Test 파일은 해당 디렉토리 내 src/test 경로에 파일을 두고 활용합니다. (Besu 쪽 테스트 코드 참조하여 개발 권장)

## github 명령어 정리
* github 코드 가져오기
```
# snu-v0.0.1 브랜치를 타겟으로 하는 cacti 저장소 가져오기
git clone https://github.com/dcslab-bc/cacti.git -b snu-v0.0.1
```

* github 코드 수정 후 올리기
```
git status                                   # 수정된 내역 확인 (잘못 들어간 파일 없는지 체크)
git add .                                    # 수정 내역을 Local에 반영
git status                                   # 수정된 내역 확인 (초록색으로 잘 반영되었는지 체크)
git commit -m "[COMMIT_MESSAGE_TITLE]"       # 업로드 할 커밋 생성
git push origin snu-v0.0.1                   # 해당 커밋을 Remote에 반영
```

# Contributer
* Minji Lee
* Jongjin Lee
* Jihoon Ban
* Hyojin Song

***

 [![Open in Visual Studio Code](https://img.shields.io/static/v1?logo=visualstudiocode&label=&message=Open%20in%20Visual%20Studio%20Code&labelColor=2c2c32&color=007acc&logoColor=007acc)](https://open.vscode.dev/hyperledger/cactus)
 ![license](https://img.shields.io/github/license/hyperledger/cactus) [![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/4089/badge)](https://bestpractices.coreinfrastructure.org/projects/4089)
 ![GitHub issues](https://img.shields.io/github/issues/hyperledger/cactus)

![Cacti Logo Color](./images/HL_Cacti_Logo_Color.png#gh-light-mode-only)
![Cacti Logo Color](./images/HL_Cacti_Logo_Colorreverse.svg#gh-dark-mode-only)

# Hyperledger Cacti

Hyperledger Cacti is a multi-faceted pluggable interoperability framework to link networks built on heterogeneous distributed ledger and blockchain technologies and to run transactions spanning multiple networks. This project is the result of a merger of the [Weaver Lab](https://github.com/hyperledger-labs/weaver-dlt-interoperability) project with **Hyperledger Cactus**, which was subsequently renamed to **Cacti**. It draws on the cutting-edge technological features of both constituent projects to provide a common general purpose platform and toolkit for DLT interoperability. This was the first-of-a-kind merger of two systems, architecture and code bases, to create a new project, under the Hyperledger Foundation. See this [Hyperledger Foundation blog article](https://www.hyperledger.org/blog/2022/11/07/introducing-hyperledger-cacti-a-multi-faceted-pluggable-interoperability-framework) for more information about the merger.

Cacti is an _Incubation_ Hyperledger project, inheriting that status from Hyperledger Cactus. Information on the different stages of a Hyperledger project and graduation criteria can be found in
the [Hyperledger Project Incubation Exit Criteria document](https://wiki.hyperledger.org/display/TSC/Project+Incubation+Exit+Criteria).

## Scope of Project

The existence of several blockchain and distributed ledger technologies of different flavors in the market as well as networks of varying scopes and sizes built on them necessitates the need for interoperability and integration, lest we end up with a fragmented ecosystem where digital assets and the workfows (often contracts) governing them remain isolated in silos. The solution to this is not to force all chains to coalesce (i.e., "*a single chain to rule them all*") but rather enable the networks to orchestrate transactions spanning their boundaries without sacrificing security, privacy, or governance autonomy (i.e., self-sovereignty). Hyperledger Cacti offers a family of protocols, modules, libraries, and SDKs, that can enable one network to be interoperable with, and carry out transactions directly with, another while eschewing the need for a central or common settlement chain. Cacti will allow networks to share ledger data, and exchange and transfer assets atomically, and manage identities, across their boundaries, as illustrated in the figure below.

<img src="./images/cacti-vision.png">

As a fusion of two earlier systems (Cactus and Weaver) that have similar philosophies and goals, yet offer distinct mechanisms backed by differemt design and trust assumptions, Cacti offers a spectrum of selectable and configurable features for cross-network transaction orchestrations. An example illustrated below shows how distributed applications running on Fabric and Besu ledgers respectively can carry out the same set of cross-network transactions using the **Node Server** (Cactus legacy) or through **Relays** (Weaver legacy).

<img src="./images/tx-orchestration-modes.png">

The present (initial) version of the Cacti code base is simply an aggregation of the legacy Cactus and Weaver code bases with their original folder structures. Until merge and integration (see further below), users should examine, test, and use them separately as follows:
- Cactus code and documentation lies within this (root) folder, excluding the `weaver` folder. See [Cactus documentation](./README-cactus.md) to test and use Cactus.
- Weaver code and documentation lies within the [weaver](./weaver/) folder. See [Weaver documentation](./weaver/README.md) to test and use Weaver.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for details on the envisioned integration.

## Inclusive Language Statement

These guiding principles are very important to the maintainers and therefore
we respectfully ask all contributors to abide by them as well:

- Consider that users who will read the docs are from different backgrounds and
cultures and that they have different preferences.
- Avoid potential offensive terms and, for instance, prefer "allow list and
deny list" to "white list and black list".
- We believe that we all have a role to play to improve our world, and even if
writing inclusive documentation might not look like a huge improvement, it's a
first step in the right direction.
- We suggest to refer to
[Microsoft bias free writing guidelines](https://docs.microsoft.com/en-us/style-guide/bias-free-communication)
and
[Google inclusive doc writing guide](https://developers.google.com/style/inclusive-documentation)
as starting points.

## Contact
* mailing list: [cacti@lists.hyperledger.org](mailto:cacti@lists.hyperledger.org)
* discord channel: [https://discord.com/invite/hyperledger](https://discord.com/invite/hyperledger)

## Contributing
We welcome contributions to Hyperledger Cacti in many forms, and there’s always plenty to do!

Please review [contributing](/CONTRIBUTING.md) guidelines to get started.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE](/LICENSE) file.
