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
        'testresources==2.0.1',
        'base58==2.1.0',
        'bidict==0.21.4',
        'certifi==2021.5.30',
        'cffi==1.14.6',
        'charset-normalizer==2.0.3',
        'click==8.0.1',
        'cryptography==3.4.7',
        'dnspython==1.16.0',
        'eventlet==0.31.1',
        'Flask==2.0.1',
        'Flask-SocketIO==5.1.1',
        'gevent==21.1.2',
        'greenlet==1.1.0',
        'idna==3.2',
        'itsdangerous==2.0.1',
        'Jinja2==3.0.1',
        'MarkupSafe==2.0.1',
        'pycparser==2.20',
        'PyJWT==2.4.0',
        'python-engineio==4.3.0',
        'python-socketio==5.5.0',
        'python3-indy==1.16.0',
        'PyYAML==5.4.1',
        'requests==2.26.0',
        'six==1.16.0',
        'urllib3==1.26.6',
        'websocket==0.2.1',
        'Werkzeug==2.0.1',
        'zope.event==4.5.0',
        'zope.interface==5.4.0'
    ],
    classifiers=[
        'Development Status :: Initial version',
        'Programming Language :: Python :: 3',
        'Intended Audience :: Developers'
    ]
)
