import codecs
import os

from setuptools import setup

here = os.path.abspath(os.path.dirname(__file__))

with codecs.open(os.path.join(here, 'README.md'), encoding="utf-8") as fh:
    LONG_DESCRIPTION = f'/n{fh.read()}'

VERSION = '0.0.1'
DESCRIPTION = 'Python Cactus Validator Indy'

WHL_VALIDATOR_DIR = '/validator-python'
WHL_VALIDATOR_CONFIG_DIR = '/validator_socketio_indy'
WHL_OTHER_FILES_DIR = '/other'

WHL_LOCAL_SOCKET_IO_MODULE_DIR = f'{WHL_VALIDATOR_DIR}/validator_socketio_module'

LOCAL_CONFIG_DIR = './config'

setup(
    name='CactusValidatorSocketIOIndy',
    version=VERSION,
    description=DESCRIPTION,
    long_description_content_type='text/markdown',
    long_description=LONG_DESCRIPTION,
    data_files=[
        (
            WHL_VALIDATOR_DIR, [
                f'.{WHL_VALIDATOR_DIR}/main.py'
            ],
        ),
        (
            WHL_LOCAL_SOCKET_IO_MODULE_DIR, [
                f'.{WHL_LOCAL_SOCKET_IO_MODULE_DIR}/__init__.py',
                f'.{WHL_LOCAL_SOCKET_IO_MODULE_DIR}/AbstractConnector.py',
                f'.{WHL_LOCAL_SOCKET_IO_MODULE_DIR}/IndyConnector.py',
                f'.{WHL_LOCAL_SOCKET_IO_MODULE_DIR}/Settings.py',
                f'.{WHL_LOCAL_SOCKET_IO_MODULE_DIR}/SocketIoValidator.py'
            ]
        ),
        (
            WHL_VALIDATOR_CONFIG_DIR, [
                f'{LOCAL_CONFIG_DIR}/node-settings.yaml',
                f'{LOCAL_CONFIG_DIR}/node-validator-registry.yaml',
                f'{LOCAL_CONFIG_DIR}/validator-001-secrets.yaml',
                f'{LOCAL_CONFIG_DIR}/validator-001-settings.yaml'
            ]
        ),
        (
            WHL_OTHER_FILES_DIR, [
                './supervisord.conf',
                './post_install_script.py'
            ]
        )
    ],
    author='Cactus Contributors',
    author_email='...',
    include_package_data=True,
    url='https://github.com/hyperledger/cactus/tree/main/packages-python/cactus_validator_socketio_indy',
    install_requires=[
        'base58==2.1.1',
        'bidict==0.22.1',
        'blinker==1.6.2',
       ' cffi==1.15.1',
        'click==8.1.6',
        'cryptography==41.0.4',
        'dnspython==1.16.0',
        'eventlet==0.31.1',
        'Flask==2.3.2',
        'Flask-SocketIO==5.1.1',
        'greenlet==2.0.2',
        'importlib-metadata==6.8.0',
        'itsdangerous==2.1.2',
        'Jinja2==3.1.2',
        'MarkupSafe==2.1.3',
        'pycparser==2.21',
        'PyJWT==2.4.0',
        'python-engineio==4.5.1',
        'python-socketio==5.8.0',
        'python3-indy==1.16.0',
        'PyYAML==5.4.1',
        'six==1.16.0',
        'Werkzeug==3.0.1',
        'zipp==3.16.2'
    ],
    classifiers=[
        'Development Status :: Initial version',
        'Programming Language :: Python :: 3',
        'Intended Audience :: Developers'
    ]
)