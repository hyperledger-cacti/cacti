const API = {
  ROOT: '/api/v1',
  AUTH: '/auth',
  ASSETS: '/assets',
  ACTORS: '/actors',
};

const ACTORS = [
  {
    name: 'VALIDATOR1',
    type: 'VALIDATOR',
    ethAddress: '0xed9d02e382b34818e88B88a309c7fe71E65f419d',
    constKey: 'BULeR8JyUWhiuuCMU/HLA0Q5pzkYT+cHII3ZKBey3Bo=',
    host: 'localhost',
    port: 6050,
  },
  {
    name: 'VALIDATOR2',
    type: 'VALIDATOR',
    ethAddress: '0xca843569e3427144cead5e4d5999a3d0ccf92b8e',
    constKey: 'QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc=',
    host: 'localhost',
    port: 6051,
  },
  {
    name: 'VALIDATOR3',
    type: 'VALIDATOR',
    ethAddress: '0x0fbdc686b912d7722dc86510934589e0aaf3b55a',
    constKey: '1iTZde/ndBHvzhcl7V68x44Vx7pl8nwx9LqnM/AfJUg=',
    host: 'localhost',
    port: 6052,
  },
  {
    name: 'VALIDATOR4',
    type: 'VALIDATOR',
    ethAddress: '0x9186eb3d20cbd1f5f992a950d808c4495153abd5',
    constKey: 'oNspPPgszVUFw0qmGFfWwh1uxVUXgvBxleXORHj07g8=',
    host: 'localhost',
    port: 6053,
  },
];

module.exports = { ACTORS, API };
