set -e 

echo "Building pip package for Indy validator"
python3 setup.py bdist_wheel

echo "Create image"
docker build . -t indy-validator