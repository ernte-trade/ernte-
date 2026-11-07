#!/bin/bash
# ERNTE / VALKO – inštalácia kamier dvora na Raspberry Pi (alebo iný Linux).
# Spustenie:  curl -fsSL https://ernte-trade.github.io/ernte-/farmar/kamery/install.sh | sudo bash
set -e
if [ "$(id -u)" != "0" ]; then echo "Spusti so sudo:  curl -fsSL https://ernte-trade.github.io/ernte-/farmar/kamery/install.sh | sudo bash"; exit 1; fi
echo "▶ Inštalujem ffmpeg a python3…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq ffmpeg python3 curl >/dev/null
mkdir -p /opt/ernte-cam /var/lib/ernte-cam
echo "▶ Sťahujem program kamier…"
curl -fsSL "https://ernte-trade.github.io/ernte-/farmar/kamery/ernte_cam.py?$(date +%s)" -o /opt/ernte-cam/ernte_cam.py
python3 -c "import ast;ast.parse(open('/opt/ernte-cam/ernte_cam.py').read())"
chmod 700 /var/lib/ernte-cam
cat >/etc/systemd/system/ernte-cam.service <<'EOF'
[Unit]
Description=ERNTE kamery dvor
After=network-online.target
Wants=network-online.target
[Service]
ExecStart=/usr/bin/python3 /opt/ernte-cam/ernte_cam.py
Restart=always
RestartSec=10
Environment=ERNTE_CAM_HOME=/var/lib/ernte-cam
[Install]
WantedBy=multi-user.target
EOF
# automatická aktualizácia programu každú noc o 4:10
cat >/etc/cron.d/ernte-cam <<'EOF'
10 4 * * * root curl -fsSL "https://ernte-trade.github.io/ernte-/farmar/kamery/ernte_cam.py" -o /opt/ernte-cam/new.py && python3 -c "import ast;ast.parse(open('/opt/ernte-cam/new.py').read())" && mv /opt/ernte-cam/new.py /opt/ernte-cam/ernte_cam.py && systemctl restart ernte-cam
EOF
systemctl daemon-reload
systemctl enable --now ernte-cam >/dev/null 2>&1
systemctl restart ernte-cam
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "✅ Hotovo. Zariadenie beží a spustí sa samo aj po výpadku prúdu."
echo ""
echo "   Teraz v mobile (pripojenom na Wi-Fi dvora) otvor:"
echo "   👉  http://$IP:8080"
echo "   a vlož kód zariadenia z aplikácie + IP adresy a účty kamier."
echo ""
