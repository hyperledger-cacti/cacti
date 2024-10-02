# Getting Started with Create React App

## Run with Docker

### Using a pre-built image

`docker run -p 2000:2000 aaugusto11/cactus-example-cbdc-bridging-frontend:v2`

### Building the image locally

```
docker build -t cbdc-app-frontend .

docker run -p 2000:2000 cbdc-app-frontend
```

### Running in debug mode

```
yarn start
```
### Config Variables  

```
PORT=2000 // port where the frontend will be running
REACT_APP_BACKEND_PATH=http://localhost:9999 // set this to the path where the cbdc backend is running
```

Runs the app in the development mode.\
Open [http://localhost:2000](http://localhost:2000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.
