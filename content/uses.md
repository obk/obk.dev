---
title: uses · obk
menu: uses
order: 4
description: the machines and software obk uses, for development and for gaming.
url: https://obk.dev/uses/
---

a running list of what's on my machines, inspired by [wesbos.com/uses](https://wesbos.com/uses) and the [uses.tech](https://uses.tech) directory.

## machines

<details open>
<summary><h3 id="dev">dev</h3></summary>

<details>
<summary><h4 id="work">work</h4></summary>

os
: fedora

processor
: intel core i7-1255u

graphics
: intel iris xe, built in

memory
: 16 gb

storage
: kingston nvme, 512 gb

</details>

<details>
<summary><h4 id="ikari">ikari</h4></summary>

model
: macbook pro, 14 inch

processor
: apple m5 pro

memory
: 48 gb

storage
: 1 tb

</details>

</details>

<details open>
<summary><h3 id="desktop">desktop</h3></summary>

<details>
<summary><h4 id="ayanami">ayanami</h4></summary>

os
: windows

processor
: amd ryzen 7 7700x, under an arctic liquid freezer ii 240

graphics
: zotac geforce rtx 4080 trinity

memory
: 32 gb of ddr5 at 6000 mhz

storage
: samsung 980 pro 2 tb and kioxia exceria g2 1 tb

motherboard
: msi pro b650-p wifi

power
: msi mpg a1000g, 1000 w

case
: cooler master masterbox td500 v2

</details>

<details>
<summary><h4 id="peripherals">peripherals</h4></summary>

monitor
: asus rog strix xg27acg, 1440p at 180 hz

keyboard
: wooting 80he

mouse
: logitech g pro x superlight 2

microphone
: hyperx duocast

console
: sony playstation 5 digital edition, with a kingston fury renegade 2 tb

</details>

</details>

<details open>
<summary><h3 id="servers">servers</h3></summary>

<details>
<summary><h4 id="soryu">soryu</h4></summary>

model
: raspberry pi 5

memory
: 16 gb

use
: a claude code agent

</details>

<details>
<summary><h4 id="nagisa">nagisa</h4></summary>

model
: raspberry pi 5

memory
: 2 gb

use
: adguard home

</details>

<details>
<summary><h4 id="akagi">akagi</h4></summary>

model
: beelink gti15 ultra

os
: proxmox

processor
: intel core ultra 9

memory
: 64 gb

</details>

<details>
<summary><h4 id="katsuragi">katsuragi</h4></summary>

model
: a vps

use
: the tailscale exit node

</details>

</details>

<details>
<summary><h3 id="network">network</h3></summary>

gateway
: unifi ux7

switch
: unifi flex 2.5g poe, unifi flex mini and unifi flex mini 2.5g

wifi
: unifi u7 pro

nas
: unifi unas 2, with two seagate exos 8 tb

</details>

<details>
<summary><h3 id="other-devices">other devices</h3></summary>

phone
: iphone 15

tws
: airpods pro 2, usb-c

wired
: moondrop kadenz and apple earpods

dac
: moondrop moonriver 3

tv
: samsung s95h, with an apple tv 4k, 3rd generation

music
: ipod classic, 5th generation, with a 256 gb ssd

</details>

## apps

<details>
<summary><h3 id="apps-development">development</h3></summary>

editor
: zed

font
: lilex nerd font

theme
: catppuccin: latte by day, mocha by night

language
: go, mostly

containers
: podman on linux; orbstack on macos

assistant
: claude code

shell
: fish, with oh my posh

terminal
: ghostty

multiplexer
: herdr

</details>

<details>
<summary><h3 id="everyday">everyday</h3></summary>

browser
: helium

chat
: signal and discord

music
: spotify

video
: vlc on linux; iina on macos

menu bar
: stats and aldente, on macos

archives
: keka, on macos

</details>

<details>
<summary><h3 id="apps-servers">servers</h3></summary>

media
: jellyfin

photos
: immich

passwords
: vaultwarden

network
: tailscale

dns
: adguard home

automation
: sonarr, radarr and prowlarr, with transmission

</details>

<details>
<summary><h2 id="topology">topology</h2></summary>

```text
+-----------+
| katsuragi | - - - - - internet
+-----------+               |
                            |
                     +-------------+
                     |  unifi ux7  |  gateway
                     +-------------+
                            |
+--------+           +-------------+     +-----------+
| u7 pro |-----------|  unifi flex |-----| flex mini |
+--------+           |   2.5g poe  |     +-----------+
                     +-------------+           |
                            |                  |
                            |            +-----+----+
                            |            |          |
                            |      +----------+  +-----+
                            |      | apple tv |  | ps5 |
                            |      +----------+  +-----+
                            |
      +----------+----------+
      |          |          |
 +---------+ +-------+      |
 | ayanami | | ikari |      |
 +---------+ +-------+      |
                            |
                   +----------------+
                   | flex mini 2.5g |
                   +----------------+
                            |
    .  servers  . . . . . . | . . . . . . . . . . . . . . .
    :       +------------+--+---------+------------+      :
    :       |            |            |            |      :
    :  +---------+  +---------+  +---------+  +---------+ :
    :  |  unas 2 |  |  akagi  |  |  nagisa |  |  soryu  | :
    :  +---------+  +---------+  +---------+  +---------+ :
    :                proxmox      adguard      claude     :
    :                + immich                  code        :
    :                + radarr                             :
    :                + sonarr                             :
    :                + prowlarr                           :
    :                + jellyfin                           :
    :                + vaultwarden                        :
    :                + transmission                       :
    . . . . . . . . . . . . . . . . . . . . . . . . . . . .
```

</details>
