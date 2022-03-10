import os
import shutil


def __copy(source: str, destination: str) -> bool:
    """Copy given content from source to destination"""

    # Check if source exists
    check_source_file = os.path.isfile(source)
    check_source_dir = os.path.isdir(source)

    if not check_source_dir and not check_source_file:
        print(f'Provided source location: {source} does not exist')
        return False

    # Check if destination exists
    # If not, create destination
    if not os.path.isdir(destination):
        print(f'Provided destination: {destination} does not exist. Creating...')
        try:
            os.makedirs(destination)
        except Exception as mkdir_err:
            print(mkdir_err)
            return False

    # Copy file
    if check_source_file:
        file_name = os.path.basename(source)

        if os.path.isfile(f'{destination}/{file_name}'):
            print(f'File {file_name} already exists in destination {destination}. Removing old one...')
            try:
                os.remove(f'{destination}/{file_name}')
            except Exception as remove_err:
                print(remove_err)
                return False
        try:
            shutil.copyfile(src=source, dst=f'{destination}/{file_name}')
        except Exception as copyfile_err:
            print(copyfile_err)
            return False

    # Copy dir
    if check_source_dir:
        try:
            shutil.copytree(src=source, dst=destination, dirs_exist_ok=True)
        except Exception as copytree_err:
            print(copytree_err)
            return False

    return True


# Execute script
if __name__ == '__main__':

    # Destination dirs
    CONFIG_DST_DIR = '/etc/cactus-indy'
    INDY_HOME_DIR = '/home/indy'
    VALIDATOR_DST_DIR = f'{INDY_HOME_DIR}/validator-python'
    SUPERVISORD_DST_DIR = '/etc'
    UTILS_LOCATION = f'{INDY_HOME_DIR}/from-indy-sdk'
    SITE_PACKAGES = f'{INDY_HOME_DIR}/.local/lib/python3.8/site-packages'

    # Copy configs
    if __copy(source=f'{SITE_PACKAGES}/validator_socketio_indy', destination=CONFIG_DST_DIR):
        print('Configs successfully copied')

    # Copy validator
    if __copy(source=f'{SITE_PACKAGES}/validator-python', destination=VALIDATOR_DST_DIR):
        print('Validator successfully copied')

    # Copy supervisord.conf file
    if __copy(source=f'{SITE_PACKAGES}/other/supervisord.conf', destination='/etc'):
        print('supervisord file successfully copied')
    # Copy utils.py
    if __copy(source=f'{UTILS_LOCATION}/utils.py',
              destination=f'{VALIDATOR_DST_DIR}/validator_socketio_module'):
        print('utils file successfully copied')

    print('Copying done')

    # Cleanup
    files_to_remove = [
        f'{SITE_PACKAGES}/validator_socketio_indy',
        f'{SITE_PACKAGES}/validator-python',
        f'{SITE_PACKAGES}/other',
        f'{INDY_HOME_DIR}/CactusValidatorSocketIOIndy-0.0.1-py3-none-any.whl',
        f'{SITE_PACKAGES}/CactusValidatorSocketIOIndy-0.0.1.dist-info'
    ]

    for file in files_to_remove:
        try:
            if os.path.isfile(file):
                os.remove(file)
            else:
                shutil.rmtree(file)
        except Exception as err:
            print(err)
        else:
            print(f'Cleaning of {file} successfully ended')

    print('Cleaning done')
