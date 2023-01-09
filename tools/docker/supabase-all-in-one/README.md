# supabase-all-in-one

An all in one supabase image that can be used as Cactus GUI backend.
- This docker image is for `testing` and `development` only.
- **Do NOT use in production!**

## Usage
- Password: `your-super-secret-and-long-postgres-password`

### Docker Compose
``` bash
./script-start-docker.sh
```

or manually:

``` bash
docker-compose build && docker-compose up -d
```

### Docker
> Excute from the cactus root or adjust the paths accordingly.

``` bash
# Build
DOCKER_BUILDKIT=1 docker build ./tools/docker/supabase-all-in-one -t cactus-supabase-all-in-one

# Run
docker run --name supabase_all_in_one_gui \
  --detach \
  --privileged \
  -p 3000:3000 \
  -p 8000:8000 \
  -p 5432:5432 \
  cactus-supabase-all-in-one
```
