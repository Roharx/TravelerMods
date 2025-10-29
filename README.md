# TokenTraveler v1.2.1

**Automated Token Moving/Teleportation System for Roll20**

Hey there!  
I'm pretty new to the Roll20 modding community, but I hope to share helpful tools to make your lives easier as **Dungeon Masters** (and maybe later on, as **Players** too).

---

## ✨ Origin Story

While setting up a new campaign, I wanted a way to **teleport tokens between maps**—but existing solutions were a bit too complex for me.  

Since I have some JavaScript experience, I studied the amazing work behind *[MapTeleporters](https://gist.github.com/finalfrog/124f67ad84204546caf16fffd84115e4)* and built my own lightweight, customizable version:  
**TokenTraveler** — an **automated token teleportation mod** that makes moving tokens between maps or points effortless.

---

## 🚀 Features

- Instantly teleport tokens between connected points  
- Supports **multi-node sequences** (e.g., 1 → 2 → 3 → 1 …)  
- Works across **maps and layers** (GM layer, Token layer, etc.)  
- **Notification toggle** for GM whisper messages  
- **Pattern control system** (ascending, descending, random, odd-even)  
- Preserves token attributes when teleporting across maps  

---

## ⚙️ Commands

| Command | Description |
|----------|-------------|
| `!TokenTraveler --notification-off` | Disable GM whisper notifications |
| `!TokenTraveler --notification-on` | Enable GM whisper notifications *(default)* |

---

## 🧭 How It Works

You can place **any token** on any layer (GM layer recommended for hidden portals, or Token layer for visible interactive ones).  
Then simply **rename the token** to follow this format:

```
Traveler:<GroupName>:<NodeId>
```

### 🔹 Example 1: Two-node teleport
```
Traveler:RavengaardCity:1
Traveler:RavengaardCity:2
```
➡ Tokens will travel **back and forth** between these two nodes.

### 🔹 Example 2: Multi-node teleport
```
Traveler:RavengaardCity:1
Traveler:RavengaardCity:2
Traveler:RavengaardCity:3
```
➡ Tokens will travel **in sequence:** 1 → 2 → 3 → 1 → 2 → 3 → …

### 🔹 Cross-map teleport
When teleporting across maps, the script **clones** the triggering token with all its properties, places it on the target map, and **removes** the original.  
*(Roll20 tokens cannot change `pageid` directly, hence the clone behavior.)*

### 🔹 Same-map teleport
When teleporting within the same map, tokens are moved using **Roll20’s native animation** system.

---

## 🧩 Pattern System (v1.0+)

You can optionally define a **teleportation pattern** in the Traveler name:

```
Traveler:<GroupName>:<NodeId>:<Mode>
```

| Mode | Description |
|------|--------------|
| `ascending` | Default 1 → 2 → 3 → 1 → ... |
| `descending` | Reverse order 3 → 2 → 1 → 3 → ... |
| `random` | Teleports to a random node (not self) |
| `odd-even` | Alternates odd/even paths (1 → 3 → 5, 2 → 4 → 6, etc.) |

💡 You can mix and match modes between nodes:
```
Traveler:RavengaardCity:1:odd-even
Traveler:RavengaardCity:2:random
Traveler:RavengaardCity:3:descending
```
Example result: `1 → 3 → 2 → random(1 or 2)`

---

## ⚠️ Important Notes

Before using:
1. Ensure tokens you want to teleport **have a name** (Token Settings → General → Name).
2. Ensure tokens **have an image**. Roll20 won’t recreate tokens without an assigned picture.

These will be automated in future updates.

---

## 🧭 Planned Updates

- [x] Add sequence pattern system ✅  
- [x] Multiple entry points to one endpoint (like a teleportation circle) ✅
- [ ] Multiple selectable endpoints from one entry point  
- [ ] Optional **sound effects** during teleportation  
- [ ] Further optimizations & QoL improvements  

Have a suggestion or idea?  
💬 Open an [issue](../../issues) or leave a [comment](https://app.roll20.net/forum/post/12550698/teleporting-and-moving-tokens-between-preset-points) — I’d love to hear your thoughts!

---

## 🧰 Version History

### **v1.2.1**
- Minor bugfix with circles not being separated properly.

### **v1.2 – Teleportation Circles**
Adds support for a new **Teleportation Circle Mode**, allowing you to define dedicated entry and exit points.

```
Traveler:<GroupName>:<NodeId>:circle-entry
Traveler:<GroupName>:<NodeId>:circle-exit
```

Any `circle-entry` token in a group will teleport directly to that group's `circle-exit`.

#### 🧱 Example:
```
Traveler:RavengaardCity:1:circle-exit
Traveler:RavengaardCity:2:circle-entry
Traveler:RavengaardCity:3:circle-entry
```
➡ Tokens stepping on **2** or **3** will teleport to **1**.  
Node 1 acts as the **anchor** and does **not teleport out**.

#### 🧩 Notes:
- You can **never enter** a teleportation circle exit.
- You can use the same group for multiple entries:
  ```
  Traveler:RavengaardCity:1:circle-exit
  Traveler:RavengaardCity:1:circle-entry
  Traveler:RavengaardCity:1:circle-entry
  ```
  Tokens stepping on any of the `1:circle-entry` tokens will be moved to the `1:circle-exit`.

This setup makes it easy to manage **multiple teleportation circles** within the same city or region while keeping them organized.

---

### **v1.1**
- Fixed a cooldown initialization bug that caused teleportation errors.  

### **v1.0**
- Added sequence pattern system with ascending, descending, random, and odd-even modes.

---

## 🧑‍💻 Author

**Roharx**  
Building fun, practical, and magical Roll20 tools for DMs everywhere.  
These mods are a hobby project, they are open source and free to use — just leave a comment or mention where you found it!
