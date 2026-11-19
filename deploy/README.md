# Deploying SumiTeX

This guide puts SumiTeX on a server of your own, for you or a group, behind HTTPS. It takes about an hour, most of it waiting for the image to build.

SumiTeX runs as three containers: SumiTeX itself, MongoDB and Redis. With sandboxed compiles on (the default), every compile also runs in a short-lived TeX Live container, so a document can't touch the server or other people's files.

## What you need

- **A Linux server**, x86-64. Building wants about 8 GB of memory and 4 CPUs. Running it for a small group needs about 4 GB.
- **About 60 GB of free disk**: around 10 GB for the SumiTeX images and 30 GB for a full TeX Live image, plus your projects and room for upgrades. Without sandboxed compiles (step 4), about 20 GB.
- **Docker Engine 24 or later with the Compose plugin** (`docker compose version` should work). [Install Docker](https://docs.docker.com/engine/install/).
- **Git**.
- **A domain name** pointing at the server, for HTTPS.

The commands below assume a user that can run `docker` (in the `docker` group) and `sudo`.

## 1. Get the code

```bash
git clone https://github.com/bigphu/sumitex.git
cd sumitex
git checkout v0.5.1
```

Pick the [latest release](https://github.com/bigphu/sumitex/releases) in place of `v0.5.1`.

## 2. Build the image

```bash
deploy/build-image
```

This builds `sumitex/sumitex:0.5.1` (the version comes from the release you checked out) and tags it `latest` too. The first build takes 30–60 minutes; later ones reuse Docker's cache. It builds from a clean copy of the commit, so local edits you haven't committed are left out.

If downloading TeX Live is slow, pick a closer [CTAN mirror](https://ctan.org/mirrors):

```bash
TEXLIVE_MIRROR=https://mirror.example.org/CTAN/systems/texlive/tlnet deploy/build-image
```

## 3. Configure

```bash
cd deploy
cp .env.example .env
```

Edit `.env`. At the least:

- **`SUMITEX_DATA_DIR`**: where everything is kept, as an absolute path. Create it first:

  ```bash
  sudo mkdir -p /srv/sumitex
  ```

- **`OVERLEAF_SITE_URL`**: the address people will use, such as `https://latex.example.com`.
- **`OVERLEAF_INVITE_TOKEN_SECRET`** and **`OVERLEAF_SESSION_SECRET`**: two different random strings. Generate each with:

  ```bash
  openssl rand -hex 32
  ```

- **`OVERLEAF_SECURE_COOKIE=true`**: uncomment it once the site is served over HTTPS (step 6). Any value turns it on, so keep the line commented out while you test over plain HTTP.

On a server with 4 GB of memory, also add `docker-compose.small.yml` to `COMPOSE_FILE` (the line is in `.env.example`): it caps the memory MongoDB keeps, from up to half the RAM to 0.5 GB.

The rest can stay as it is: the app name, the TeX Live images and email are explained in the file.

## 4. Get TeX Live

Sandboxed compiles need the TeX Live image named in `.env`. It's large, so pull it before the first start:

```bash
docker pull ghcr.io/ayaka-notes/texlive-full:2026.1
```

To offer several years, list each in `ALL_TEX_LIVE_DOCKER_IMAGES` (with names in `ALL_TEX_LIVE_DOCKER_IMAGE_NAMES`), pull each one, and users can pick one per project.

**Only trusted users?** You can skip the sandbox and compile inside the SumiTeX container with its smaller TeX Live. Set `COMPOSE_FILE=docker-compose.yml` in `.env` and skip this step. Don't do this on a server open to strangers: compiles could then read the server's files.

## 5. Start it

```bash
docker compose up -d
docker compose logs -f sumitex
```

The first start sets up the database and takes a minute or two. It's ready when the log quiets down; press Ctrl+C to stop following it (SumiTeX keeps running).

SumiTeX now listens on `127.0.0.1:8080`, on the server only. To reach it before HTTPS is set up, tunnel from your own computer:

```bash
ssh -L 8080:127.0.0.1:8080 you@your-server
```

Then open <http://localhost:8080/launchpad> and **create the first admin account**, then log in with it. The launchpad offers this only while there are no users.

## 6. HTTPS

Put a reverse proxy in front for HTTPS. [Caddy](https://caddyserver.com/docs/install) is the shortest: it gets and renews the certificate on its own. In `/etc/caddy/Caddyfile`:

```
latex.example.com {
	reverse_proxy 127.0.0.1:8080
	request_body {
		max_size 100MB
	}
}
```

Then reload it with `sudo systemctl reload caddy`.

With **nginx** instead (certificates from certbot or your own):

```nginx
server {
    listen 443 ssl;
    server_name latex.example.com;
    ssl_certificate     /etc/letsencrypt/live/latex.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/latex.example.com/privkey.pem;

    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        # Real-time collaboration uses WebSockets
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 10m;
        proxy_send_timeout 10m;
    }
}

server {
    listen 80;
    server_name latex.example.com;
    return 301 https://$host$request_uri;
}
```

Once HTTPS works, set `OVERLEAF_SECURE_COOKIE=true` in `.env` and apply it:

```bash
docker compose up -d
```

## 7. Invite people

As the admin, open `/admin/register` (also under the **Admin** menu) to add accounts. Each new user gets a link to set a password; without email (below), copy the link from that page and send it yourself.

**Email**, for invitations and password resets: fill in the `OVERLEAF_EMAIL_…` lines in `.env` with your SMTP server's details. Then set `EMAIL_CONFIRMATION_DISABLED=false` and run `docker compose up -d`.

Logging in with LDAP, SAML or OpenID Connect works as in AyakaLeaf Pro; see its [documentation](https://github.com/ayaka-notes/ayakaleaf-pro).

## Day to day

Run these from the `deploy` folder:

| To | Run |
|---|---|
| See what's running | `docker compose ps` |
| Follow the logs | `docker compose logs -f sumitex` |
| Restart | `docker compose restart sumitex` |
| Stop everything | `docker compose stop` |
| Start again | `docker compose up -d` |
| Open a shell inside | `docker compose exec sumitex bash` |

## Backups

Everything lives in `SUMITEX_DATA_DIR`. `deploy/backup` stops SumiTeX for a minute, packs the data (projects, history, database; compile scratch files are left out), starts it again and keeps the newest 7 archives in `SUMITEX_DATA_DIR/backups`:

```bash
sudo deploy/backup
```

Run it as root, since the containers write files as root. To run it every night at 04:30, add this to root's crontab (`sudo crontab -e`):

```
30 4 * * *  /home/you/sumitex/deploy/backup >> /var/log/sumitex-backup.log 2>&1
```

Copy the archives somewhere other than the server (another machine, or object storage). To restore, stop SumiTeX (`docker compose stop`), unpack an archive into an empty `SUMITEX_DATA_DIR`, and start it again.

## Upgrading

Back up first, then build the new release and switch to it:

```bash
cd sumitex
git fetch --tags
git checkout v0.6.0          # the new release
deploy/build-image
```

Set `SUMITEX_VERSION` in `deploy/.env` to the new version, then:

```bash
cd deploy
docker compose up -d
```

Database changes run on their own at start. Read the release notes before upgrading, for anything to do by hand. To go back, set the old `SUMITEX_VERSION` and restore the backup you made.

## When something goes wrong

- **"Missing required secrets"** in the log: `OVERLEAF_INVITE_TOKEN_SECRET` is empty in `.env`.
- **Compiles fail at once, or say the image can't be found**: the TeX Live image from `.env` isn't pulled (step 4), or the name in `TEX_LIVE_DOCKER_IMAGE` doesn't match what `docker images` lists.
- **Logged out at every click, or "invalid CSRF token"**: `OVERLEAF_SECURE_COOKIE` is set but the site is reached over plain HTTP. Use HTTPS, or comment the line out.
- **The editor connects, then disconnects**: the proxy isn't passing WebSockets. Check the `Upgrade` and `Connection` lines in the nginx example.
- **Uploads fail**: raise the proxy's body size limit (`client_max_body_size` in nginx, `max_size` in Caddy).
- **The build stops with "killed" or exit code 137**: not enough memory. Add swap or build on a bigger machine; the image runs fine with less.
- **Port 8080 is taken**: change `SUMITEX_PORT` in `.env`, and the proxy to match.

Still stuck? [Open an issue](https://github.com/bigphu/sumitex/issues) with the output of `docker compose ps` and the last 100 lines of `docker compose logs sumitex`, minus anything private.

## Licence

SumiTeX is under the [GNU AGPL v3](../LICENSE). Running it unchanged for others is fine. If you change it and let others use it over a network, the AGPL asks you to offer them your changed source, for example with a link in the footer (`OVERLEAF_RIGHT_FOOTER` in `.env`) to your fork.
