-- Sample test input for fabric GUI. Can be used to check the views manually without running the persistence plugin first.
-- Clear:
-- TRUNCATE fabric.block, fabric.certificate, fabric.transaction, fabric.transaction_action, fabric.transaction_action_endorsement, public.plugin_status
--
-- Data for Name: block; Type: TABLE DATA; Schema: fabric; Owner: postgres
--
INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    'dac7bd3b-e232-4d75-9050-e84404afd618',
    1,
    '0x3d4cd7578038163492bc87f1a2a55529ab557f0bf882805084097d98fa04ea29',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '7e6cb22c-8dc4-4a69-be68-32fc69ed0e35',
    2,
    '0x78702e216f5a4772ef56087636a52aef66f23ce49e93f8a89c1eb06fe5448b2c',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '20d9af60-50c3-4c92-8847-270e69ce57c0',
    3,
    '0xe6656aa10d9f73fde8db5b0ce6bba9a2bc3118c72ef9d69b53b9f7c512139d60',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '95485cea-b99b-490d-bfe4-663d8b7c6d13',
    4,
    '0x33c2bd426ac7175b4c36968d0021c11f1bc261c403bc4f3531c47882cfc6a322',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    'ecafe65a-09c7-49de-9250-cb4e71aa1fd3',
    5,
    '0xe8cfcf5f567db8df353a21c7aff71ef6d67ef2367091e3ee7167268559546e60',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    'fb9c6a3d-3b9c-4d36-b140-525559a6956f',
    6,
    '0x21f672d5ba88376ba50c6238477bc4ccab5b6af96502ba24cc7ecbe7aad81e4a',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '612c96de-1ba5-43f8-a50c-c685c1085b14',
    7,
    '0xf612c7d8b5574d321a2c9b1a43676cd9a11a2f07eac07cad0babe4aa7eebd463',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '9418c830-35ec-4538-884c-ba72b5a21f0f',
    8,
    '0xb80bbbc8cf85912f2da83a6d4e6c9f59d6117c9c2cfff4ce3e87dbb20071f343',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    'ca782d76-f248-4971-be25-1f8c7ca5b780',
    9,
    '0xc7ad52f1578d4a112cb2f590dac2822090970e56efb64718082426ff1ebeebb2',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '420f3616-8844-48de-a903-ab75eb87b888',
    10,
    '0x6cd450d353ff819c7acb580380d40271471f3f9b7ace44cb1f3f7a7030d73f01',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    'b6c8f046-8f58-4637-b41e-a8abe4d519cd',
    11,
    '0x5aba71c9e5386fcd7bf2b77c992d1a7bb9fea16f7d6317dfea944212c32d6766',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '398b74de-aec6-478f-9d9e-304418628a27',
    12,
    '0xbd6979bbdb237e4c6a274e1d1ba798ff4d7623df8f8e1c6d1c1f7146b1af3ecd',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '34489777-8abf-4fff-be2d-cb13d191d057',
    13,
    '0x371792cf3b2b75037c5fe62d469e5161df2f88100d0985d47e79d4e7ebf3f9ee',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '56b1f4dd-1090-4168-8d61-c732e664bccf',
    14,
    '0xdd7bf1536073d0e460b3575bcd4f4a94612a6adac4b4544e6e8052f5bb2ec98a',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '3741a620-1953-4b25-ade2-7fdafe4a56f8',
    15,
    '0x974561eb868fd3612fce6c6d2e90cb728929c83cb2404b56ed87e74486eea90e',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '1d70b16b-3a1a-4546-8450-7db5a857f424',
    16,
    '0xf8c4881f13721e3d662e940dffc84ad61f995dd44bb8078ec2fd05ee5c95dee0',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    'fd151abb-c943-4a60-83ae-43d55b48b6d6',
    17,
    '0xe5de599c2072390ac02c8cc2d45e4384972387aa1ef50b97cd5c7fd8279cf2ee',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    '966bb844-f81a-4778-9232-b5c71e1d3903',
    18,
    '0x5fbdbed33d85a3481fd77991f5cc11f90d3908554ae433611124a470f08f2e79',
    1
  );

INSERT INTO
  fabric.block (id, number, hash, transaction_count)
VALUES
  (
    'ef66a97d-10a8-4195-a169-1cd3e6722ac8',
    19,
    '0x79002d52127b411c0589eb1c3253f1f488945dca51f1d8cd628b3390185cf307',
    1
  );

--
-- Data for Name: certificate; Type: TABLE DATA; Schema: fabric; Owner: postgres
--
INSERT INTO
  fabric.certificate (
    id,
    serial_number,
    subject_common_name,
    subject_org_unit,
    subject_org,
    subject_locality,
    subject_state,
    subject_country,
    issuer_common_name,
    issuer_org_unit,
    issuer_org,
    issuer_locality,
    issuer_state,
    issuer_country,
    subject_alt_name,
    valid_from,
    valid_to,
    pem
  )
VALUES
  (
    '53c39873-46ce-44a5-876f-bda47c24ed0c',
    '16C8C9A05A2B7EFA6ED794F28A2FBCE6DED1C86C',
    'org1admin',
    'admin',
    'Hyperledger',
    '',
    'North Carolina',
    'US',
    'ca.org1.example.com',
    '',
    'org1.example.com',
    'Durham',
    'North Carolina',
    'US',
    'DNS:9071369d9d11',
    '2024-06-10 10:50:00+00',
    '2025-06-10 10:55:00+00',
    '-----BEGIN CERTIFICATE-----
MIICqTCCAlCgAwIBAgIUFsjJoForfvpu15Tyii+85t7RyGwwCgYIKoZIzj0EAwIw
cDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH
EwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh
Lm9yZzEuZXhhbXBsZS5jb20wHhcNMjQwNjEwMTA1MDAwWhcNMjUwNjEwMTA1NTAw
WjBgMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExFDASBgNV
BAoTC0h5cGVybGVkZ2VyMQ4wDAYDVQQLEwVhZG1pbjESMBAGA1UEAxMJb3JnMWFk
bWluMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEaCjVDW8X3Fpa7lXTrjNACJG
mslK1ppx9uzh9Fqk2lLN7GxcJSi2hcIyTK9+udwbRynDHl1HgMG/fLBfqrkCNKOB
1zCB1DAOBgNVHQ8BAf8EBAMCB4AwDAYDVR0TAQH/BAIwADAdBgNVHQ4EFgQUTw/b
Ss21vEgoQbb2wnwXF4DkCTEwHwYDVR0jBBgwFoAUgN29gMPVb3dfnq0ngxTg67qy
iQkwFwYDVR0RBBAwDoIMOTA3MTM2OWQ5ZDExMFsGCCoDBAUGBwgBBE97ImF0dHJz
Ijp7ImhmLkFmZmlsaWF0aW9uIjoiIiwiaGYuRW5yb2xsbWVudElEIjoib3JnMWFk
bWluIiwiaGYuVHlwZSI6ImFkbWluIn19MAoGCCqGSM49BAMCA0cAMEQCIGzNQ3Ut
iHpsKZzzIadYTY7TlC7FliD+XI89FyzM2RqoAiALJ2yU42wNnfrRuByQQN9cHz1j
ArKZknDfP6HYxUS0RQ==
-----END CERTIFICATE-----
'
  );

INSERT INTO
  fabric.certificate (
    id,
    serial_number,
    subject_common_name,
    subject_org_unit,
    subject_org,
    subject_locality,
    subject_state,
    subject_country,
    issuer_common_name,
    issuer_org_unit,
    issuer_org,
    issuer_locality,
    issuer_state,
    issuer_country,
    subject_alt_name,
    valid_from,
    valid_to,
    pem
  )
VALUES
  (
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    '3D697828B3244EDC75A95CCC30FC5013B904F6E5',
    'peer0',
    'peer',
    'Hyperledger',
    '',
    'North Carolina',
    'US',
    'ca.org1.example.com',
    '',
    'org1.example.com',
    'Durham',
    'North Carolina',
    'US',
    'DNS:9071369d9d11',
    '2024-06-10 10:50:00+00',
    '2025-06-10 10:55:00+00',
    '-----BEGIN CERTIFICATE-----
MIICnzCCAkagAwIBAgIUPWl4KLMkTtx1qVzMMPxQE7kE9uUwCgYIKoZIzj0EAwIw
cDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH
EwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh
Lm9yZzEuZXhhbXBsZS5jb20wHhcNMjQwNjEwMTA1MDAwWhcNMjUwNjEwMTA1NTAw
WjBbMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExFDASBgNV
BAoTC0h5cGVybGVkZ2VyMQ0wCwYDVQQLEwRwZWVyMQ4wDAYDVQQDEwVwZWVyMDBZ
MBMGByqGSM49AgEGCCqGSM49AwEHA0IABOBN1m+Sd4tJgk7cj/2tjncS0DDaZrpB
XScgGyyvFu7WvUNAX5huTiUcP6RPnfQ2op1fgaPvHwVWQ4sLwU3wYqSjgdIwgc8w
DgYDVR0PAQH/BAQDAgeAMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFOWzZpC41lih
5kCb9Dhd/w626Ve7MB8GA1UdIwQYMBaAFIDdvYDD1W93X56tJ4MU4Ou6sokJMBcG
A1UdEQQQMA6CDDkwNzEzNjlkOWQxMTBWBggqAwQFBgcIAQRKeyJhdHRycyI6eyJo
Zi5BZmZpbGlhdGlvbiI6IiIsImhmLkVucm9sbG1lbnRJRCI6InBlZXIwIiwiaGYu
VHlwZSI6InBlZXIifX0wCgYIKoZIzj0EAwIDRwAwRAIgCNafIs0XRatMvyu1Mj62
4LVXfIgyolfaFaOZaFtjJdYCIA4bciJH/vMOdbxoAbNr7B83P1GEfHLdmd2yy7D1
Vi3u
-----END CERTIFICATE-----
'
  );

INSERT INTO
  fabric.certificate (
    id,
    serial_number,
    subject_common_name,
    subject_org_unit,
    subject_org,
    subject_locality,
    subject_state,
    subject_country,
    issuer_common_name,
    issuer_org_unit,
    issuer_org,
    issuer_locality,
    issuer_state,
    issuer_country,
    subject_alt_name,
    valid_from,
    valid_to,
    pem
  )
VALUES
  (
    '03fe59e9-9540-4c19-851d-11de61c6ee84',
    '138E42BC35217601BC9B8D631232E26880A2EFCD',
    'org2admin',
    'admin',
    'Hyperledger',
    '',
    'North Carolina',
    'US',
    'ca.org2.example.com',
    '',
    'org2.example.com',
    'Hursley',
    'Hampshire',
    'UK',
    'DNS:9071369d9d11',
    '2024-06-10 10:50:00+00',
    '2025-06-10 10:55:00+00',
    '-----BEGIN CERTIFICATE-----
MIICpTCCAkygAwIBAgIUE45CvDUhdgG8m41jEjLiaICi780wCgYIKoZIzj0EAwIw
bDELMAkGA1UEBhMCVUsxEjAQBgNVBAgTCUhhbXBzaGlyZTEQMA4GA1UEBxMHSHVy
c2xleTEZMBcGA1UEChMQb3JnMi5leGFtcGxlLmNvbTEcMBoGA1UEAxMTY2Eub3Jn
Mi5leGFtcGxlLmNvbTAeFw0yNDA2MTAxMDUwMDBaFw0yNTA2MTAxMDU1MDBaMGAx
CzAJBgNVBAYTAlVTMRcwFQYDVQQIEw5Ob3J0aCBDYXJvbGluYTEUMBIGA1UEChML
SHlwZXJsZWRnZXIxDjAMBgNVBAsTBWFkbWluMRIwEAYDVQQDEwlvcmcyYWRtaW4w
WTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARegEoielYCE4rD9zGSp7hfSnvqDNZr
NCTZ2RNQtjt/skOaf9QPNNpPqGEC1b9MH/RiX0AaTkOzQqLv/86BpKXMo4HXMIHU
MA4GA1UdDwEB/wQEAwIHgDAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBQNSRYsRxQ7
C3FzkG9hQTii+NllmzAfBgNVHSMEGDAWgBTqU3ENOraRPq6JewJvIU9wNWIkgDAX
BgNVHREEEDAOggw5MDcxMzY5ZDlkMTEwWwYIKgMEBQYHCAEET3siYXR0cnMiOnsi
aGYuQWZmaWxpYXRpb24iOiIiLCJoZi5FbnJvbGxtZW50SUQiOiJvcmcyYWRtaW4i
LCJoZi5UeXBlIjoiYWRtaW4ifX0wCgYIKoZIzj0EAwIDRwAwRAIgAVyUc87cUDWo
qCSJ+kIZ+ZJ4R0qCcV4J43FGLZKOZ1YCIHoOiJsa01L4iEZqNHvWsStaMdBU7Knc
yg47qdnDt+4X
-----END CERTIFICATE-----
'
  );

INSERT INTO
  fabric.certificate (
    id,
    serial_number,
    subject_common_name,
    subject_org_unit,
    subject_org,
    subject_locality,
    subject_state,
    subject_country,
    issuer_common_name,
    issuer_org_unit,
    issuer_org,
    issuer_locality,
    issuer_state,
    issuer_country,
    subject_alt_name,
    valid_from,
    valid_to,
    pem
  )
VALUES
  (
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    '71649A396B1760F3384A854456EE7C8E3EC7DFB6',
    'peer0',
    'peer',
    'Hyperledger',
    '',
    'North Carolina',
    'US',
    'ca.org2.example.com',
    '',
    'org2.example.com',
    'Hursley',
    'Hampshire',
    'UK',
    'DNS:9071369d9d11',
    '2024-06-10 10:50:00+00',
    '2025-06-10 10:55:00+00',
    '-----BEGIN CERTIFICATE-----
MIICnDCCAkKgAwIBAgIUcWSaOWsXYPM4SoVEVu58jj7H37YwCgYIKoZIzj0EAwIw
bDELMAkGA1UEBhMCVUsxEjAQBgNVBAgTCUhhbXBzaGlyZTEQMA4GA1UEBxMHSHVy
c2xleTEZMBcGA1UEChMQb3JnMi5leGFtcGxlLmNvbTEcMBoGA1UEAxMTY2Eub3Jn
Mi5leGFtcGxlLmNvbTAeFw0yNDA2MTAxMDUwMDBaFw0yNTA2MTAxMDU1MDBaMFsx
CzAJBgNVBAYTAlVTMRcwFQYDVQQIEw5Ob3J0aCBDYXJvbGluYTEUMBIGA1UEChML
SHlwZXJsZWRnZXIxDTALBgNVBAsTBHBlZXIxDjAMBgNVBAMTBXBlZXIwMFkwEwYH
KoZIzj0CAQYIKoZIzj0DAQcDQgAEvEZTQytr0uskquy873bYYtV6bBI4EnCFkIKb
Oan5DnAFbrlQFWyZ0R79lPbUlCdiV4LQUD1jqLR7ozSI0YxPp6OB0jCBzzAOBgNV
HQ8BAf8EBAMCB4AwDAYDVR0TAQH/BAIwADAdBgNVHQ4EFgQUfsphGAik86sP58SQ
QSAyezUQjfMwHwYDVR0jBBgwFoAU6lNxDTq2kT6uiXsCbyFPcDViJIAwFwYDVR0R
BBAwDoIMOTA3MTM2OWQ5ZDExMFYGCCoDBAUGBwgBBEp7ImF0dHJzIjp7ImhmLkFm
ZmlsaWF0aW9uIjoiIiwiaGYuRW5yb2xsbWVudElEIjoicGVlcjAiLCJoZi5UeXBl
IjoicGVlciJ9fTAKBggqhkjOPQQDAgNIADBFAiEA3n+PBUzGvAQaKzOMqyPCn55v
ksOKGCeIYBZjdj7YO/YCIFn/p5z0p//NsxdDP1k+7C0x6Lpn6S0qhWVLMkvobhLR
-----END CERTIFICATE-----
'
  );

INSERT INTO
  fabric.certificate (
    id,
    serial_number,
    subject_common_name,
    subject_org_unit,
    subject_org,
    subject_locality,
    subject_state,
    subject_country,
    issuer_common_name,
    issuer_org_unit,
    issuer_org,
    issuer_locality,
    issuer_state,
    issuer_country,
    subject_alt_name,
    valid_from,
    valid_to,
    pem
  )
VALUES
  (
    'f1673034-a3cf-47eb-a246-0457da9ee369',
    '67347B298F2E73DDE069B6FCCDCB26CFE1688A08',
    'admin',
    'client',
    '',
    '',
    '',
    '',
    'ca.org1.example.com',
    '',
    'org1.example.com',
    'Durham',
    'North Carolina',
    'US',
    '',
    '2024-06-10 10:50:00+00',
    '2025-06-10 12:01:00+00',
    '-----BEGIN CERTIFICATE-----
MIIB8zCCAZmgAwIBAgIUZzR7KY8uc93gabb8zcsmz+FoiggwCgYIKoZIzj0EAwIw
cDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH
EwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh
Lm9yZzEuZXhhbXBsZS5jb20wHhcNMjQwNjEwMTA1MDAwWhcNMjUwNjEwMTIwMTAw
WjAhMQ8wDQYDVQQLEwZjbGllbnQxDjAMBgNVBAMTBWFkbWluMFkwEwYHKoZIzj0C
AQYIKoZIzj0DAQcDQgAEpQDXkuOEKWY3D9bGTh0v7cjqXLGVPXq5aKUTsw6M7ipN
C3VxQGvY8KIQ0tbAz4GQh2tQKyPhglItfYKD49o3HKNgMF4wDgYDVR0PAQH/BAQD
AgeAMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFKikYBlAJcEX7WRtfbjzAC6ODzI1
MB8GA1UdIwQYMBaAFIDdvYDD1W93X56tJ4MU4Ou6sokJMAoGCCqGSM49BAMCA0gA
MEUCIQDKt/qrpa+i5iXym9UT4ajhuMjMx/FSQkcSQIokx3RTbAIgYmEvAdKHaaMv
Gs3YfnTJA8S1rzQNEz9n0J7TnsuLDZs=
-----END CERTIFICATE-----
'
  );

INSERT INTO
  fabric.certificate (
    id,
    serial_number,
    subject_common_name,
    subject_org_unit,
    subject_org,
    subject_locality,
    subject_state,
    subject_country,
    issuer_common_name,
    issuer_org_unit,
    issuer_org,
    issuer_locality,
    issuer_state,
    issuer_country,
    subject_alt_name,
    valid_from,
    valid_to,
    pem
  )
VALUES
  (
    'a2e26ed7-ee35-4cdb-be8e-013406ca3534',
    '25B509C0754E3D7AD5C4959BBBCAED7575C9DCCA',
    'admin',
    'client',
    '',
    '',
    '',
    '',
    'ca.org1.example.com',
    '',
    'org1.example.com',
    'Durham',
    'North Carolina',
    'US',
    '',
    '2024-06-10 10:50:00+00',
    '2025-06-10 12:04:00+00',
    '-----BEGIN CERTIFICATE-----
MIIB8zCCAZmgAwIBAgIUJbUJwHVOPXrVxJWbu8rtdXXJ3MowCgYIKoZIzj0EAwIw
cDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH
EwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh
Lm9yZzEuZXhhbXBsZS5jb20wHhcNMjQwNjEwMTA1MDAwWhcNMjUwNjEwMTIwNDAw
WjAhMQ8wDQYDVQQLEwZjbGllbnQxDjAMBgNVBAMTBWFkbWluMFkwEwYHKoZIzj0C
AQYIKoZIzj0DAQcDQgAEMJYaVNRAB+mlgL43LcFiRu4OnNKKvRww1tuVgDcEw+61
ov1cF0Gp5+ZUsWBNRNOVtbqJWeuwImnpZyOKg3VuYqNgMF4wDgYDVR0PAQH/BAQD
AgeAMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFISb10JMkBPiJElqdwHscdlXlwed
MB8GA1UdIwQYMBaAFIDdvYDD1W93X56tJ4MU4Ou6sokJMAoGCCqGSM49BAMCA0gA
MEUCIQDJHp/QkukCdnUe10ma6aAip8hGabFXLqgqooq2iOasCwIgCnOjACStpDLc
j8Fxno3p3EAmocwmZyu4wxnVmqfKdhs=
-----END CERTIFICATE-----
'
  );

--
-- Data for Name: transaction; Type: TABLE DATA; Schema: fabric; Owner: postgres
--
INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    '8f85a1ed-047f-470a-a8f6-5468cb568c74',
    '4affb3661c2a8075e52e8e6826e1768616bb1f8c588b1baa54368a3996a54de8',
    'mychannel',
    '2024-06-10 10:55:26.036+00',
    0,
    'ENDORSER_TRANSACTION',
    0,
    '20d9af60-50c3-4c92-8847-270e69ce57c0',
    3
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    '763aa5f5-3d5c-4d87-b785-554ce9baa27f',
    '3a8bb1d1fc19c6efaba9f59d20f551840470ee3aa2924669593064996a224306',
    'mychannel',
    '2024-06-10 10:55:34.219+00',
    0,
    'ENDORSER_TRANSACTION',
    0,
    '95485cea-b99b-490d-bfe4-663d8b7c6d13',
    4
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    '3da28b37-5817-4e13-b25d-fec29247d105',
    '6364aaf8837b4d8a6b538a2863ec32cc00e1368424d7da5731f308518172c2cd',
    'mychannel',
    '2024-06-10 10:55:42.378+00',
    0,
    'ENDORSER_TRANSACTION',
    0,
    'ecafe65a-09c7-49de-9250-cb4e71aa1fd3',
    5
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    'efa0703d-72c6-48fc-bd88-2a19de2f5009',
    '72d7370e137e14ae580117021fbfef9a1f235d9f4c401bb271ee73756e6b85e2',
    'mychannel',
    '2024-06-10 10:56:00.665+00',
    0,
    'ENDORSER_TRANSACTION',
    0,
    'fb9c6a3d-3b9c-4d36-b140-525559a6956f',
    6
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    'c267a857-ab8a-4032-aa0d-4827bd3c1309',
    '6eea68b063283f01041225919098a0928430a2319996ca03a98324b14bccb97c',
    'mychannel',
    '2024-06-10 12:02:00.127+00',
    0,
    'ENDORSER_TRANSACTION',
    0,
    '612c96de-1ba5-43f8-a50c-c685c1085b14',
    7
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    'ce9da32f-ae2f-401d-8283-9e447ddaf190',
    '5f544cb92cffb0e9ed1db8a8f51b11c580c8b9961eafcdf6ca78628392d5a47d',
    'mychannel',
    '2024-06-10 12:02:08.28+00',
    0,
    'ENDORSER_TRANSACTION',
    0,
    '9418c830-35ec-4538-884c-ba72b5a21f0f',
    8
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    '350c09f7-3d30-432c-b152-bb8bf9496f26',
    'a379dac7b3d43fc295298a0ddde25039a4a31e6b9478c211a2ee440ae5816d49',
    'mychannel',
    '2024-06-10 12:02:16.461+00',
    0,
    'ENDORSER_TRANSACTION',
    0,
    'ca782d76-f248-4971-be25-1f8c7ca5b780',
    9
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    '93453b98-f6ef-404f-b919-c0e4f4269a48',
    '46b1b9ca469b3e446edd7b36e0ea2d9c07ba8f0d07e69b9e505c7ab6ac54d16e',
    'mychannel',
    '2024-06-10 12:02:25.673+00',
    1,
    'ENDORSER_TRANSACTION',
    0,
    '420f3616-8844-48de-a903-ab75eb87b888',
    10
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    'e75ed8b2-4784-4de4-8b9c-ee633161b0b9',
    '7262d91cde3512c541f00bd1df2a1f39fc4a1b9d8e0dc39648c40d8e7a3c3d93',
    'mychannel',
    '2024-06-10 12:02:58.26+00',
    0,
    'ENDORSER_TRANSACTION',
    0,
    'b6c8f046-8f58-4637-b41e-a8abe4d519cd',
    11
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    'a37ddb15-a366-43e3-8bc9-3d3b71b1d54e',
    '1f5482b9ff1ed7c14263f9cfe45fba937c4af8d0ec26019313338c927e46ee95',
    'mychannel',
    '2024-06-10 12:03:06.467+00',
    0,
    'ENDORSER_TRANSACTION',
    0,
    '398b74de-aec6-478f-9d9e-304418628a27',
    12
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    'ac2ce381-3ce9-410b-a4f1-ede6aaa0dab1',
    'da57d660e6e5d2226d400ccda9c8f0db715e1052e432a1470cca63780251e32a',
    'mychannel',
    '2024-06-10 12:03:14.642+00',
    0,
    'ENDORSER_TRANSACTION',
    0,
    '34489777-8abf-4fff-be2d-cb13d191d057',
    13
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    '7f076209-512c-449c-86fd-8054714750a8',
    '2ecbca537099fd71cda7cdce3550e4bfdd9cea0fcf3079faa85d832b6964a580',
    'mychannel',
    '2024-06-10 12:03:24.714+00',
    1,
    'ENDORSER_TRANSACTION',
    0,
    '56b1f4dd-1090-4168-8d61-c732e664bccf',
    14
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    '54fec888-dd87-49cb-aac3-933f0dcea308',
    '5d0058b145ffaa0a718bd6c2ed9565f77e812d153e7895b1185de7088b007a80',
    'mychannel',
    '2024-06-10 12:03:28.422+00',
    1,
    'ENDORSER_TRANSACTION',
    0,
    '3741a620-1953-4b25-ade2-7fdafe4a56f8',
    15
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    '1c060a70-9ccd-4c3b-9ec9-bc9afe8138d9',
    'e4b02e92986a02a16d793ba4bf59334c3171c7080814cfdd3472547b5cfb78ea',
    'mychannel',
    '2024-06-10 12:03:31.073+00',
    1,
    'ENDORSER_TRANSACTION',
    0,
    '1d70b16b-3a1a-4546-8450-7db5a857f424',
    16
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    'ebc2b58b-3244-4576-9d5a-acd25ec041d9',
    '4246b59dd61f591e35d8bd0359b7a7d157b65826eb43a6a45ed6f1031478cf7b',
    'mychannel',
    '2024-06-10 12:04:31.605+00',
    1,
    'ENDORSER_TRANSACTION',
    0,
    'fd151abb-c943-4a60-83ae-43d55b48b6d6',
    17
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    '80c35806-4d2b-4b20-90e0-46c3cbb38ded',
    '4b0e2134da73bf9f4c8809b274fd84af85ff5f1a8f2497da40597bb520010b49',
    'mychannel',
    '2024-06-10 12:04:35.65+00',
    1,
    'ENDORSER_TRANSACTION',
    0,
    '966bb844-f81a-4778-9232-b5c71e1d3903',
    18
  );

INSERT INTO
  fabric.transaction (
    id,
    hash,
    channel_id,
    "timestamp",
    protocol_version,
    type,
    epoch,
    block_id,
    block_number
  )
VALUES
  (
    '08371e04-4054-48ba-808b-e0c5706aa64c',
    'd2760e8e510d9b3f22fb5abcce88a85048936a95d6e4787d60598264220d5a71',
    'mychannel',
    '2024-06-10 12:04:38.37+00',
    1,
    'ENDORSER_TRANSACTION',
    0,
    'ef66a97d-10a8-4195-a169-1cd3e6722ac8',
    19
  );

--
-- Data for Name: transaction_action; Type: TABLE DATA; Schema: fabric; Owner: postgres
--
INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '141be4d2-8460-43b1-8048-b622331bdb0b',
    'ApproveChaincodeDefinitionForMyOrg',
    '0x0801120562617369631a05312e302e314a50124e0a4c62617369635f312e302e313a36353062376234663561383534356437313036353164633031656465653863663833353138656634623336613637613038626530363162613134646136353361',
    '_lifecycle',
    'Org1MSP',
    '53c39873-46ce-44a5-876f-bda47c24ed0c',
    '8f85a1ed-047f-470a-a8f6-5468cb568c74'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '6b3420a0-310d-4218-8499-7766411c862e',
    'ApproveChaincodeDefinitionForMyOrg',
    '0x0801120562617369631a05312e302e314a50124e0a4c62617369635f312e302e313a36353062376234663561383534356437313036353164633031656465653863663833353138656634623336613637613038626530363162613134646136353361',
    '_lifecycle',
    'Org2MSP',
    '03fe59e9-9540-4c19-851d-11de61c6ee84',
    '763aa5f5-3d5c-4d87-b785-554ce9baa27f'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    'b5336c96-d69f-4c06-8fef-ec7d0ecc9a06',
    'CommitChaincodeDefinition',
    '0x0801120562617369631a05312e302e31',
    '_lifecycle',
    'Org2MSP',
    '03fe59e9-9540-4c19-851d-11de61c6ee84',
    '3da28b37-5817-4e13-b25d-fec29247d105'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    'e718b8ff-7924-4425-8882-080862a39de0',
    'InitLedger',
    '',
    'basic',
    'Org1MSP',
    '53c39873-46ce-44a5-876f-bda47c24ed0c',
    'efa0703d-72c6-48fc-bd88-2a19de2f5009'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    'fa53978f-87b3-4474-89cf-283ee053ee88',
    'ApproveChaincodeDefinitionForMyOrg',
    '0x0801120e636f7079417373657454726164651a05312e302e314a5912570a55636f7079417373657454726164655f312e302e313a61326231383362313332363538313065653533666431666131363934613830366465653433363134303461663130373365623362323361333362636361613039',
    '_lifecycle',
    'Org1MSP',
    '53c39873-46ce-44a5-876f-bda47c24ed0c',
    'c267a857-ab8a-4032-aa0d-4827bd3c1309'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    'b0f8b304-cadc-4c19-9488-8be5d61df037',
    'ApproveChaincodeDefinitionForMyOrg',
    '0x0801120e636f7079417373657454726164651a05312e302e314a5912570a55636f7079417373657454726164655f312e302e313a61326231383362313332363538313065653533666431666131363934613830366465653433363134303461663130373365623362323361333362636361613039',
    '_lifecycle',
    'Org2MSP',
    '03fe59e9-9540-4c19-851d-11de61c6ee84',
    'ce9da32f-ae2f-401d-8283-9e447ddaf190'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '798a7d3d-8374-49ed-87a2-3986e7675204',
    'CommitChaincodeDefinition',
    '0x0801120e636f7079417373657454726164651a05312e302e31',
    '_lifecycle',
    'Org2MSP',
    '03fe59e9-9540-4c19-851d-11de61c6ee84',
    '350c09f7-3d30-432c-b152-bb8bf9496f26'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '12100ece-02d9-4216-ac6a-5abfc9c2acf1',
    'InitLedger',
    '',
    'copyAssetTrade',
    'Org1MSP',
    'f1673034-a3cf-47eb-a246-0457da9ee369',
    '93453b98-f6ef-404f-b919-c0e4f4269a48'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '2353d5b0-7a69-47ec-8417-27caa677c4b9',
    'ApproveChaincodeDefinitionForMyOrg',
    '0x0801121170726976617465417373657454726164651a05312e302e31322e0a2c120c120a080112020800120208011a0d120b0a074f7267314d535010031a0d120b0a074f7267324d535010033aefbfbd020a770a750a0f6173736574436f6c6c656374696f6e122a0a28120c120a080112020800120208011a0b12090a074f7267314d53501a0b12090a074f7267324d53501801200128efbfbdefbfbd3d30013801422a0a28120c120a080112020800120208011a0b12090a074f7267314d53501a0b12090a074f7267324d53500a580a560a184f7267314d535050726976617465436f6c6c656374696f6e12190a17120812060801120208001a0b12090a074f7267314d535020012803300142190a17120812060801120208001a0b12090a074f7267314d53500a580a560a184f7267324d535050726976617465436f6c6c656374696f6e12190a17120812060801120208001a0b12090a074f7267324d535020012803300142190a17120812060801120208001a0b12090a074f7267324d53504a5c125a0a5870726976617465417373657454726164655f312e302e313a39633334323164373963633638613337313031663235363964643635616664333066356664666634313737663166363532313130633861633036633636356462',
    '_lifecycle',
    'Org1MSP',
    '53c39873-46ce-44a5-876f-bda47c24ed0c',
    'e75ed8b2-4784-4de4-8b9c-ee633161b0b9'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '0e093307-90c1-45ce-835f-20fd4096e442',
    'ApproveChaincodeDefinitionForMyOrg',
    '0x0801121170726976617465417373657454726164651a05312e302e31322e0a2c120c120a080112020800120208011a0d120b0a074f7267314d535010031a0d120b0a074f7267324d535010033aefbfbd020a770a750a0f6173736574436f6c6c656374696f6e122a0a28120c120a080112020800120208011a0b12090a074f7267314d53501a0b12090a074f7267324d53501801200128efbfbdefbfbd3d30013801422a0a28120c120a080112020800120208011a0b12090a074f7267314d53501a0b12090a074f7267324d53500a580a560a184f7267314d535050726976617465436f6c6c656374696f6e12190a17120812060801120208001a0b12090a074f7267314d535020012803300142190a17120812060801120208001a0b12090a074f7267314d53500a580a560a184f7267324d535050726976617465436f6c6c656374696f6e12190a17120812060801120208001a0b12090a074f7267324d535020012803300142190a17120812060801120208001a0b12090a074f7267324d53504a5c125a0a5870726976617465417373657454726164655f312e302e313a39633334323164373963633638613337313031663235363964643635616664333066356664666634313737663166363532313130633861633036633636356462',
    '_lifecycle',
    'Org2MSP',
    '03fe59e9-9540-4c19-851d-11de61c6ee84',
    'a37ddb15-a366-43e3-8bc9-3d3b71b1d54e'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '54554be3-4c3f-4da5-9fc3-8ec8aab321d7',
    'CommitChaincodeDefinition',
    '0x0801121170726976617465417373657454726164651a05312e302e31322e0a2c120c120a080112020800120208011a0d120b0a074f7267314d535010031a0d120b0a074f7267324d535010033aefbfbd020a770a750a0f6173736574436f6c6c656374696f6e122a0a28120c120a080112020800120208011a0b12090a074f7267314d53501a0b12090a074f7267324d53501801200128efbfbdefbfbd3d30013801422a0a28120c120a080112020800120208011a0b12090a074f7267314d53501a0b12090a074f7267324d53500a580a560a184f7267314d535050726976617465436f6c6c656374696f6e12190a17120812060801120208001a0b12090a074f7267314d535020012803300142190a17120812060801120208001a0b12090a074f7267314d53500a580a560a184f7267324d535050726976617465436f6c6c656374696f6e12190a17120812060801120208001a0b12090a074f7267324d535020012803300142190a17120812060801120208001a0b12090a074f7267324d5350',
    '_lifecycle',
    'Org2MSP',
    '03fe59e9-9540-4c19-851d-11de61c6ee84',
    'ac2ce381-3ce9-410b-a4f1-ede6aaa0dab1'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '4a07f3f4-84d9-4bcf-ae56-46d6e9ba213b',
    'TransferAsset',
    '0x617373657431,0x73616e6974792d34663133363663362d613463352d343061332d383662362d326662383539373065313762',
    'copyAssetTrade',
    'Org1MSP',
    'f1673034-a3cf-47eb-a246-0457da9ee369',
    '7f076209-512c-449c-86fd-8054714750a8'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '6457cd77-90bc-4f43-bc0f-ca031dc050db',
    'TransferAsset',
    '0x617373657431,0x6f776e65722d31636232323761652d613732312d346334612d616361322d643866353132373636303434',
    'copyAssetTrade',
    'Org1MSP',
    'f1673034-a3cf-47eb-a246-0457da9ee369',
    '54fec888-dd87-49cb-aac3-933f0dcea308'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '241b3d1b-7bc3-4153-a01d-e58100740c40',
    'CreateAsset',
    '',
    'privateAssetTrade',
    'Org1MSP',
    'f1673034-a3cf-47eb-a246-0457da9ee369',
    '1c060a70-9ccd-4c3b-9ec9-bc9afe8138d9'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '2a7cac22-32c0-47ce-9ffe-f47846369822',
    'TransferAsset',
    '0x617373657431,0x73616e6974792d37616265353338352d663336322d343238642d626365362d343166346164346435393336',
    'copyAssetTrade',
    'Org1MSP',
    'a2e26ed7-ee35-4cdb-be8e-013406ca3534',
    'ebc2b58b-3244-4576-9d5a-acd25ec041d9'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    'b10fdef0-b4ac-4688-8f14-393e75cb9e3f',
    'TransferAsset',
    '0x617373657431,0x6f776e65722d61663430383035632d393037312d343164382d623634312d373866393633313664656637',
    'copyAssetTrade',
    'Org1MSP',
    'a2e26ed7-ee35-4cdb-be8e-013406ca3534',
    '80c35806-4d2b-4b20-90e0-46c3cbb38ded'
  );

INSERT INTO
  fabric.transaction_action (
    id,
    function_name,
    function_args,
    chaincode_id,
    creator_msp_id,
    creator_certificate_id,
    transaction_id
  )
VALUES
  (
    '2f294f12-e991-460e-b873-878631f6e3ba',
    'CreateAsset',
    '',
    'privateAssetTrade',
    'Org1MSP',
    'a2e26ed7-ee35-4cdb-be8e-013406ca3534',
    '08371e04-4054-48ba-808b-e0c5706aa64c'
  );

--
-- Data for Name: transaction_action_endorsement; Type: TABLE DATA; Schema: fabric; Owner: postgres
--
INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '32b57fdf-eb8e-4e84-95eb-6350ab49e4f0',
    'Org1MSP',
    '0x304402205f576c57e2c29806c7636e6ed4d9b02e842ccbbd01dd333c8716efa927e74bac022079be4c059a36fba7ef9a767275e7d8e0f020a6898d930a9d9f2ab93a5e0d8a9b',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    '141be4d2-8460-43b1-8048-b622331bdb0b'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '931ec147-c3c6-4b98-a9bf-6dbefac27fec',
    'Org2MSP',
    '0x3045022100f8999f4a27bdd7f63f81bdf5e7b21bfb2a33d2d2016ba0349db3b3f155e977910220275eb3379f77975c6a1ff330387e7285d0b363e5be5d389b5c856de18a567683',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    '6b3420a0-310d-4218-8499-7766411c862e'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '41a0e19c-1486-4416-9276-81f6e92119de',
    'Org1MSP',
    '0x3045022100b0a631cd090e32efe65d2b97ec5c778dd22df5c98099017c48e8ce64df10c6dc022019ad2f74ae72be2875ab7cc08d0972f1d8c5ec7349faf1f39d7f00ecfe12fad7',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    'b5336c96-d69f-4c06-8fef-ec7d0ecc9a06'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '41c16940-e2db-44c7-b388-762883a280cd',
    'Org2MSP',
    '0x3044022025a01951ffec26e7927afdd12cf8bd900f41e6c91e07fbbec4521550c5142d8a02206fbb80f8d5f04d249decf1b292f436e54a96e4d5effae70697cdeddc16e933f2',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    'b5336c96-d69f-4c06-8fef-ec7d0ecc9a06'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '2733e680-fec5-4fb1-b32d-47ece4cb7ab7',
    'Org2MSP',
    '0x3045022100a21ce9346f584555b96aecba62d9ef36e0d0f86f60b70a15db5113395f4bfbc302207d88c27cf789826467d7af093f5e2c57c0346018d0e6e1078c59960c5e0fba2c',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    'e718b8ff-7924-4425-8882-080862a39de0'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '82a88ab6-5ead-48d3-b35c-0cbf5d8dfc1a',
    'Org1MSP',
    '0x3045022100a266ff30b146b4679c564ca70c3f1a030d2e9f802f0ad68a589815487da2737f02203f3f74e200d354ae1684f091112418e72ae0fbb9180ddf79c9f6fb09f4e16181',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    'e718b8ff-7924-4425-8882-080862a39de0'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '8ef51411-7463-4b6f-bf69-6ba7a4d53c78',
    'Org1MSP',
    '0x3045022100d2b3baf9b5d405591b23509b3d626f3ce34f4e180f751fb976e23afd331d172802206d722d28db45a8a1ba078f1ce5fb67afadf7223db54e7aeb8d36efaf0cc6193f',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    'fa53978f-87b3-4474-89cf-283ee053ee88'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '9be78ffb-4acd-42ac-bd1d-ba1a499e4479',
    'Org2MSP',
    '0x3045022100a41e911b1063acc5cab7bd0183162631f6cdd436779df32abf340fc1f886a431022032696fcd6474331a14788dd18b74cfddc0ff7acffc0a77dba46883ccfc24d6d4',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    'b0f8b304-cadc-4c19-9488-8be5d61df037'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    'f151d7de-77bb-4460-9c43-7ba7c7a227db',
    'Org1MSP',
    '0x304402203f7a886d62a76d1b959d1d15f8dc49e007b71259953bf1c018ef736734d142b3022034436509dd9bbd36dc0a3f256eff505213802b0069899514dd2c6177337625b0',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    '798a7d3d-8374-49ed-87a2-3986e7675204'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    'b42fcef0-061c-45af-8d2d-43678ccd4122',
    'Org2MSP',
    '0x3044022059ce716e8f141a98027dfa4bca90349d7908d8a11f84ce96045aa019688863fd0220723744bb24b05b377f3197d53e8e9086ddb648ed0e7c0608a89b6f9d367fa4ba',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    '798a7d3d-8374-49ed-87a2-3986e7675204'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    'a98e619b-df6f-4e29-b146-d3a48b9961a5',
    'Org1MSP',
    '0x30440220573ac84d386b35816a428894ef91d577134ac935910888fe8d8db3119154c13b02202a5a33a65047f3041e42a6202380c4575b25163a499184ae00aa254caa9b7026',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    '12100ece-02d9-4216-ac6a-5abfc9c2acf1'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '2e0b5d24-1a78-44c4-a40d-2a9650be6191',
    'Org2MSP',
    '0x304402202b2dbfb13258bb8d43cd96322a296dd2f746b31c9952dbfd3d457fe44c1b51a4022035f9590cdcd6b956c07a7d6c3b52aad0f543ff6960ca9230ecfb1d9f45d3b123',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    '12100ece-02d9-4216-ac6a-5abfc9c2acf1'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '2897b046-c535-4bee-ae5b-30ddbe5d0709',
    'Org1MSP',
    '0x3045022100d9328f0393e2ea40106fe1b4c9192ec01c68898289806ad88d4be3e36ab537d3022002c148d4cbc2a9d54c18eb6facfdd5cfea778d5d4db06d8329b80a6a5b4c46ea',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    '2353d5b0-7a69-47ec-8417-27caa677c4b9'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '4a6436fa-ca75-4cf5-b3e5-91b0fb25541d',
    'Org2MSP',
    '0x30440220703d56012c82285f767f8ec549204a70c679ca2a283388de9c259a6194235ce902204300723f79021e45b433511d05ebb5040da15ac783ffee204bbe1033d745624c',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    '0e093307-90c1-45ce-835f-20fd4096e442'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    'bc45a08e-500e-4962-b147-7dd7af6e9e0e',
    'Org1MSP',
    '0x304402202939b4fe7ff3490076d241b29445418e4fd65e82281d28f382d97cb3ca29544102202e6fc42fffb6c79e488fa64a682dfcadf37a08c6e46acb6337c69f0668c422de',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    '54554be3-4c3f-4da5-9fc3-8ec8aab321d7'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    'bd48f3e4-d8ab-4066-8f28-dd9eef73cea7',
    'Org2MSP',
    '0x304502210099af25b8ca50a978780d0a8411f18b692b5fff010dfdeed06f92f90d0eedac980220486c997493599f6ccc96fc57297272b9a505b28e82f29f6c9663ddcbde8821d6',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    '54554be3-4c3f-4da5-9fc3-8ec8aab321d7'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    'e6fc4db2-3b02-451a-aae8-812657180011',
    'Org1MSP',
    '0x3044022031f69fb0f8886471ace47de7a29d122b2c45bc1ac946f2e0fabde1d47002414502205aedd7ce514b4112fb4f2889a742d9c1baf28ea4cde8ac0c1d7bfd5df9506d45',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    '4a07f3f4-84d9-4bcf-ae56-46d6e9ba213b'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '5b1546ae-7f6a-4e53-91c7-53f5c44d37a3',
    'Org2MSP',
    '0x3044022013213ccb69482b39383d7ebc39d232441dff0aaa4e04d3e61a05458f9235f04c0220639a6be7e4bdbf23fa3aabb1091a2e97a7955c2572bf25724b0cfadbcdd7e647',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    '4a07f3f4-84d9-4bcf-ae56-46d6e9ba213b'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    'a5788226-4c32-4e0d-9531-92f963a27a94',
    'Org1MSP',
    '0x3044022072aa04dd848ce9c88ab25e97ad321ea7c4fd42d8d5698c8169da7c62218ff5a70220742cbfb2d65efc7734e8f058c43d575d49f3b8ae30f9735600c72153fdc34b92',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    '6457cd77-90bc-4f43-bc0f-ca031dc050db'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '28713ba5-3e13-4e7c-868f-5b1958328caa',
    'Org2MSP',
    '0x304402206678b707f6ea97754c3402efb2bdc48da26447c431652f8e056ab26dd3ae1bd002202f72fa7b310da879081a75b8c811eb4fc035affcb23cb1a6a1db7b192f612874',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    '6457cd77-90bc-4f43-bc0f-ca031dc050db'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    'd34ffff0-c222-4706-82f4-ad8a1f748dc6',
    'Org1MSP',
    '0x3045022100e2d87165940bdc4ffdf8c911fff3d61105bf7fa91daaf7cc87609d113e374786022077cf2f89a572449ac606144ba47dbc2af1b23350a58e4038b46fd43bae222b2c',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    '241b3d1b-7bc3-4153-a01d-e58100740c40'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '10e9d190-6439-4a5f-8c16-4592c2cc099f',
    'Org1MSP',
    '0x3045022100d668c8e0a325dc1f86c78b9732d5c488d245b38e32e4eb0707a5c35da94058ed02202da6c47ea1b4a8925269a9b6b66daef4b65f8cc579ae0ea0706ae2bfba104c63',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    '2a7cac22-32c0-47ce-9ffe-f47846369822'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '27f2c324-ab41-4232-840b-d87c8a1533d8',
    'Org2MSP',
    '0x3045022100ea7ec9afc68fc351bffdb0a1122eb92746c8cbd9eb10710e244eeb4b6ebbb64d022074a9d782f95a84b3b018a84360e9c5dd7927a7a04c6bde5ebdaa4f6d1755eb54',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    '2a7cac22-32c0-47ce-9ffe-f47846369822'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    'b15d9aa7-1bb6-452d-8703-694b6a61512e',
    'Org1MSP',
    '0x304402207bc491ac9b595f4a52fe7345cecc1227f5a90cfe2956de47b1c9c63e51b6e8db022067c65a8a6ee36a8cfcf0246bf84fe55ee83bf8af15c92c70c9c3f25ed79c995b',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    'b10fdef0-b4ac-4688-8f14-393e75cb9e3f'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    'ce7f0b38-6abb-4995-812d-0defe47b0452',
    'Org2MSP',
    '0x30440220226666fe809aac06003fa102f0b4475abaf5ef1dda14142dcea6a87acc05d7ea02200bfaae7a248323236e7468882d80669c4f8e992493ea0a90397bbee6e2bfafa9',
    '68241f33-108d-4cf6-abdd-94b6fe825191',
    'b10fdef0-b4ac-4688-8f14-393e75cb9e3f'
  );

INSERT INTO
  fabric.transaction_action_endorsement (
    id,
    mspid,
    signature,
    certificate_id,
    transaction_action_id
  )
VALUES
  (
    '6ccb765e-74f6-40e1-8d4f-2d8e16632b9e',
    'Org1MSP',
    '0x3045022100c4394729927c583d80ed969f8f7234e3c408ee21f45e9b59ff13fe30a1af099002205f5063955dda064fbe1b53b487185f5c6d16aacc29085560b8e7f2a71af68781',
    '85b5e29c-26bf-43fd-b0b2-ba49502e0829',
    '2f294f12-e991-460e-b873-878631f6e3ba'
  );

--
-- Data for Name: plugin_status; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  public.plugin_status (
    name,
    last_instance_id,
    is_schema_initialized,
    created_at,
    last_connected_at
  )
VALUES
  (
    'PluginPersistenceFabric',
    'functional-test',
    true,
    '2024-06-07 13:26:34.197062+00',
    '2024-06-10 12:00:39.545859+00'
  );