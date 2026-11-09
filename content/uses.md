---
title: uses · obk
description: the machines, network and software obk uses, for development and for gaming.
url: https://obk.dev/uses/
---

## uses!

a running list of what's on my machines, inspired by [wesbos.com/uses](https://wesbos.com/uses) and the [uses.tech](https://uses.tech) directory. the ones with names are named after evangelion.

<nav class="on-this-page" aria-label="on this page">
<p>on this page:</p>
<ul>
<li><a href="#machines">machines!</a></li>
<li><a href="#the-network">the network!</a></li>
<li><a href="#apps">apps!</a></li>
</ul>
</nav>

## machines!

### work, the work laptop

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

### ikari, the macbook

model
: macbook pro, 14 inch

processor
: apple m5 pro

memory
: 48 gb

storage
: 1 tb

### ayanami, the desktop

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

### at the desk

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

### the servers

soryu
: raspberry pi 5, 16 gb: a claude code agent

nagisa
: raspberry pi 5, 2 gb: adguard home

magi
: beelink gti15 ultra, intel core ultra 9, 64 gb: proxmox

katsuragi
: a vps: the tailscale exit node

### everything else

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

## the network!

gateway
: unifi ux7

switch
: unifi flex 2.5g poe, unifi flex mini and unifi flex mini 2.5g

wifi
: unifi u7 pro

nas
: unifi unas 2, with two seagate exos 8 tb

and how it all hangs together:

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
        .  servers  . . . . | . . . . . . . . . . . . . . .
        :       +-----------+-----------+-----------+     :
        :       |           |           |           |     :
        :  +--------+  +--------+  +--------+  +--------+ :
        :  | unas 2 |  |  magi  |  | nagisa |  | soryu  | :
        :  +--------+  +--------+  +--------+  +--------+ :
        :               proxmox     adguard     claude    :
        :               + immich                code      :
        :               + radarr                          :
        :               + sonarr                          :
        :               + prowlarr                        :
        :               + jellyfin                        :
        :               + vaultwarden                     :
        :               + transmission                    :
        . . . . . . . . . . . . . . . . . . . . . . . . . .
```

## apps!

### for development

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

### every day

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

### on the servers

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
