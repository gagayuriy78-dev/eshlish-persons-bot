# Google Cloud VM deployment

This runs the combined quiz and Quiet Progress admin bot using Telegram polling
under systemd. It does not publish or deploy the project to Replit. The VM only
needs outbound HTTPS access; no inbound firewall port is required.

## 1. Prepare the VM

Use Ubuntu 24.04 LTS (Python 3.12). Connect to the VM over SSH, then run:

```bash
sudo apt update
sudo apt install -y git python3 python3-venv python3-pip
python3 --version
```

The project requires Python 3.11 or newer. If the VM reports an older version,
use an Ubuntu 24.04 image before continuing.

Stop any other process polling with this same Telegram bot token before starting
the VM service. Two polling processes for one token will conflict. In particular,
stop the Replit `Telegram Bot` workflow if it is currently polling that token.

## 2. Clone the repository and create the service account

Replace the repository placeholder with the GitHub clone URL. For a private
repository, use an SSH deploy key or another secure Git authentication method;
do not put a GitHub token in the URL or shell history.

```bash
sudo useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin ishlishbot
sudo install -d -o root -g ishlishbot -m 0750 /opt/ishlish-persons-bot
sudo git clone "https://github.com/OWNER/REPOSITORY.git" /opt/ishlish-persons-bot
sudo chown -R root:ishlishbot /opt/ishlish-persons-bot
sudo chmod -R g+rX,o-rwx /opt/ishlish-persons-bot
```

## 3. Put the existing SQLite database in persistent VM storage

The service writes its database under `/var/lib/ishlish-persons-bot`, not into
the code checkout. The repository currently tracks `bot_database.db`. Copy that
file once if it contains the quiz history you want to retain. If you have a
newer database, copy that one instead.

The guarded copy below will not overwrite a database already in persistent
storage:

```bash
sudo install -d -o ishlishbot -g ishlishbot -m 0750 /var/lib/ishlish-persons-bot
if [ ! -e /var/lib/ishlish-persons-bot/bot_database.db ]; then
  sudo install -o ishlishbot -g ishlishbot -m 0600 \
    /opt/ishlish-persons-bot/bot_database.db \
    /var/lib/ishlish-persons-bot/bot_database.db
else
  echo "Existing VM database preserved; no copy performed."
fi
```

Do not repeat the copy after the service has started; it would replace the live
database if you remove the guard.

## 4. Install the Python dependencies

```bash
sudo python3 -m venv /opt/ishlish-persons-bot/.venv
sudo /opt/ishlish-persons-bot/.venv/bin/python -m pip install --upgrade pip
sudo /opt/ishlish-persons-bot/.venv/bin/python -m pip install \
  -r /opt/ishlish-persons-bot/requirements.txt
sudo chown -R root:ishlishbot /opt/ishlish-persons-bot/.venv
sudo chmod -R g+rX,o-rwx /opt/ishlish-persons-bot/.venv
```

## 5. Set secrets outside the repository

Create a root-only environment file and edit it locally on the VM:

```bash
sudo install -o root -g root -m 0600 /dev/null /etc/ishlish-persons-bot.env
sudoedit /etc/ishlish-persons-bot.env
```

Add these entries, replacing each placeholder on the VM:

```text
BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
QP_API=https://quiet-progress-720242842790.europe-west1.run.app/api
QP_BOT_TOKEN=SAME_VALUE_AS_BOT_API_TOKEN_ON_THE_SERVER
ADMIN_TELEGRAM_IDS=YOUR_TELEGRAM_ID,ANOTHER_ADMIN_ID
BOT_DATABASE_PATH=/var/lib/ishlish-persons-bot/bot_database.db
# Optional: WEB_APP_URL=https://YOUR_EXISTING_HTTPS_MINI_APP_URL
```

`WEB_APP_URL` is optional. If omitted, quiz and admin commands still run, but
the Telegram Mini App menu button is not configured. If you set it, use an
already-hosted, valid HTTPS URL. The Telegram token and `QP_BOT_TOKEN` must stay
in this VM-only file, not in source code, GitHub, or chat. Keep the file mode at
`0600`. `ADMIN_TELEGRAM_IDS` is the comma-separated Telegram ID allow-list for
`/admin`; these admins also get a message for every completed registration.
`QP_BOT_TOKEN` must equal `BOT_API_TOKEN` on the Quiet Progress server. Without
it, registration is skipped and the bot runs as before.

## 6. Install and enable systemd

```bash
sudo install -o root -g root -m 0644 \
  /opt/ishlish-persons-bot/deploy/ishlish-persons-bot.service \
  /etc/systemd/system/ishlish-persons-bot.service
sudo systemd-analyze verify /etc/systemd/system/ishlish-persons-bot.service
sudo systemctl daemon-reload
sudo systemctl enable --now ishlish-persons-bot
sudo systemctl status ishlish-persons-bot --no-pager
```

The unit starts after networking is available, restarts the bot if it exits, and
starts it again after a VM reboot.

## 7. Verify and monitor

```bash
sudo journalctl -u ishlish-persons-bot -n 100 --no-pager
sudo journalctl -u ishlish-persons-bot -f
sudo systemctl is-enabled ishlish-persons-bot
sudo systemctl is-active ishlish-persons-bot
```

Send `/start` from a new Telegram account: the bot asks for the phone number,
first name, last name, address and age, then shows the usual welcome. The
person appears at once in the Quiet Progress administrator panel
(`/admin.html`). The existing `/admin` panel and its local quiz statistics
remain unchanged.

To check automatic startup after a reboot:

```bash
sudo reboot
```

After reconnecting over SSH:

```bash
sudo systemctl status ishlish-persons-bot --no-pager
sudo journalctl -u ishlish-persons-bot -b --no-pager
```

## 8. Update the bot later

The SQLite database is stored outside the repository and is not replaced by
these update commands:

```bash
sudo systemctl stop ishlish-persons-bot
sudo git -C /opt/ishlish-persons-bot pull --ff-only
sudo /opt/ishlish-persons-bot/.venv/bin/python -m pip install \
  -r /opt/ishlish-persons-bot/requirements.txt
sudo systemctl start ishlish-persons-bot
sudo systemctl status ishlish-persons-bot --no-pager
```
