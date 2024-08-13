# supabase-all-in-one

An all in one supabase image that can be used as Cactus GUI backend.

- This docker image is for `testing` and `development` only.
- **Do NOT use in production!**

## Running

### Docker Compose

```bash
./script-start-docker.sh
```

or manually:

```bash
docker-compose build && docker-compose up -d
```

### Docker

> Excute from the cactus root or adjust the paths accordingly.

```bash
# Build
docker build ./tools/docker/supabase-all-in-one -t cactus-supabase-all-in-one

# Run
docker run --name supabase_all_in_one_gui \
  --detach \
  --privileged \
  -p 8000:8000 \
  -p 5432:5432 \
  cactus-supabase-all-in-one
```

## Usage

Supabase dashboard is available under http://localhost:8000/. Use the following credentials to access it:
- **Username**: `supabase`
- **Password**: `this_password_is_insecure_and_should_be_updated`

### Postgres access

Use the `psql` tool, database password is: `your-super-secret-and-long-postgres-password`

```sh
psql -h 127.0.0.1 -p 5432 -d postgres -U postgres
```

#### Connection string

```sh
postgresql://postgres:your-super-secret-and-long-postgres-password@127.0.0.1:5432/postgres
```

### API Key

```sh
docker exec -ti supabase_all_in_one_gui cat /home/supabase/docker/.env | grep SERVICE_ROLE_KEY
```
