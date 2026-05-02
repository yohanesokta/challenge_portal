#!/bin/bash

set -e
#

CONFIG_DIR="$HOME/.config/octaAnticheat"
BIN_PATH="$CONFIG_DIR/octa-anticheat-linux-amd64"
ARCHIVE="$CONFIG_DIR/octa-anticheat-linux-amd64.tar.gz"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SERVICE_DIR/octa-anticheat.service"
ARCHIVE_URL=https://github.com/yohanesokta/Codelab-JAI/releases/download/1.0/octa-anticheat-linux-amd64.tar.gz
ARCHIVE_HASH="19f47672df9c48a0b5b7c41a5731a9148a2f4f0c48ddf296f2494321221619a1"
ARCHIVE_TOOL_URL=https://github.com/yohanesokta/Codelab-JAI/releases/download/1.0/tools-linux-amd64.tar.gz
ARCHIVE_TOOL="$CONFIG_DIR/tools-linux-amd64.tar.gz"
ARCHIVE_TOOL_HASH="7f532ec544ac990a7f4acc0a396fe64cc8b9d175d723910140641994d911719f"


echo "Memulai instalasi Octa Anticheat..."
if ! command -v curl >/dev/null 2>&1; then
    echo "curl tidak ditemukan, silakan install curl terlebih dahulu."
    exit 1
fi
if ! command -v tar >/dev/null 2>&1; then
    echo "tar tidak ditemukan, silakan install tar terlebih dahulu."
    exit 1
fi
if ! command -v sha256sum >/dev/null 2>&1; then
    echo "sha256sum tidak ditemukan, silakan install coreutils terlebih dahulu."
    exit 1
fi
if ! command -v systemctl >/dev/null 2>&1; then
    echo "systemctl tidak ditemukan, pastikan Anda menggunakan sistem dengan systemd."
    exit 1
fi

mkdir -p "$CONFIG_DIR"
echo "Downloading Service: Octa Anticheat"
if ( [ -n "$XDG_CURRENT_DESKTOP" ] && [[ "$XDG_CURRENT_DESKTOP" == *"KDE"* ]] ) || ( [ -n "$GDMSESSION" ] && [[ "$GDMSESSION" == *"kde"* ]] ); then
    wget -L -o "$ARCHIVE_TOOL" "$ARCHIVE_TOOL_URL"
    if [ -f "$ARCHIVE_TOOL" ]; then
        FILE_HASH=$(sha256sum "$ARCHIVE_TOOL" | awk '{print $1}')
        if [ "$FILE_HASH" != "$ARCHIVE_TOOL_HASH" ]; then
            echo "Hash tidak cocok untuk tools! File mungkin rusak saat download. Silahkan Mengulang download."
            rm -f "$ARCHIVE_TOOL"
            exit 1
        fi
    else
        echo "Gagal mendownload tools!"
        exit 1
    fi
    tar -xzf "$ARCHIVE_TOOL" -C "$CONFIG_DIR"
else
    if ! command -v xdotool >/dev/null 2>&1; then
        echo "xdotool tidak ditemukan, mencoba menginstall..."
        if [ -x "$(command -v apt)" ]; then
            sudo apt update && sudo apt install -y xdotool
        elif [ -x "$(command -v dnf)" ]; then
            sudo dnf install -y xdotool
        elif [ -x "$(command -v pacman)" ]; then
            sudo pacman -S --noconfirm xdotool
        else
            echo "Package manager tidak dikenali. Silakan install xdotool secara manual."
            exit 1
        fi
    else
        echo "xdotool sudah terinstall."
    fi
fi

echo "[1/6] Membuat folder systemd user jika belum ada..."
mkdir -p "$SERVICE_DIR"

echo "[2/6] Download binary..."
curl -L -o "$ARCHIVE" "$ARCHIVE_URL"

# check hash

if [ ! -f "$ARCHIVE" ]; then
    echo "Download gagal!"
    exit 1
fi

FILE_HASH=$(sha256sum "$ARCHIVE" | awk '{print $1}')
if [ "$FILE_HASH" != "$ARCHIVE_HASH" ]; then
    echo "Hash tidak cocok untuk binary! File mungkin rusak saat download. Silahkan Mengulang download."
    rm -f "$ARCHIVE"
    exit 1
fi

echo "[3/6] Extract file..."
tar -xzf "$ARCHIVE" -C "$CONFIG_DIR"


if [ ! -f "$BIN_PATH" ]; then
    echo "Extract gagal / binary tidak ditemukan!"
    exit 1
fi

echo "[4/6] Set permission executable..."
chmod +x "$BIN_PATH"

echo "[5/6] Membuat service file..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Octa Anticheat Service
After=network.target

[Service]
Type=simple
ExecStart=$BIN_PATH
WorkingDirectory=$CONFIG_DIR
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF

echo "[6/6] Reload & start service..."
systemctl --user daemon-reload
systemctl --user enable octa-anticheat
systemctl --user restart octa-anticheat

echo "Selesai! Service aktif."
