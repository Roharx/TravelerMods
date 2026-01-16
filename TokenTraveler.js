/**
 * Documentation: TokenTraveler v1.4 Camera Follow
 * 
 * Usage: Place any form of a token on any layer (My recommendation would be GM layer for things that you don't want to be visible
 * but you can use the token layer as well for interactive portals, jump pads, etc.)
 * 
 * Name the token the following way: Traveler:name:number
 * 
 * Example1:    Traveler:RavengaardCity:1, Traveler:RavengaardCity:2
 * 
 *              Here, RavengaardCity:1 and :2 will be connected and
 *              the tokens (any kind of token that steps on it) will
 *              travel back and forth between the 2 nodes.
 * 
 * Example2:    Traveler:RavengaardCity:1, Traveler:RavengaardCity:2, Traveler:RavengaardCity:3
 * 
 *              Here, RavengaardCity:1, :2 and :3 will be connected and
 *              the tokens (any kind of token that steps on it) will
 *              travel in sequence (1>2>3>1>2>3...etc.).
 * 
 * Every teleportation places a global cooldown on teleporting for 1.5 secounds
 * This is to make sure that when a token arrives to the next Traveler point,
 * it will not immediately start teleporting to the next one. (You can change
 * it at the bottom of the code)
 * 
 * Currently how TokenTraveler works:
 * On the same map: only moves the token, this usually comes with an animation of the token being displaced
 * On different maps: cloning the triggering token to the next Traveler point and removing the one on the triggered (current) point
 * 
 * -----------------------------------------------------------------
 * 
 * v0.9 Toggle Notifications update:
 * Commands (GM only):
 *   !TokenTraveler --notification-off    → disables GM whisper notifications
 *   !TokenTraveler --notification-on     → enables GM whisper notifications
 * 
 * Default: notifications ON
 * 
 * -----------------------------------------------------------------
 * 
 * v1.0 sequence pattern system update:
 * Now supports an optional pattern parameter in Traveler names:
 * Traveler:<GroupName>:<NodeId>[:<Mode>]
 * Modes:
 *   ascending  - (default) 1→2→3→1→...
 *   descending - reverse  3→2→1→3→...
 *   random     - teleport to a random node (not self)
 *   odd-even   - 1→3→5→1, 2→4→6→2...
 * 
 * -----------------------------------------------------------------
 * 
 * TokenTraveler v1.2 (Teleportation Circles)
 * 
 * Adds support for a new mode:
 * Traveler:<GroupName>:<NodeId>:circle-entry
 * Traveler:<GroupName>:<NodeId>:circle-exit
 * 
 * Any circle-entry token in a group will teleport directly to that group's circle-exit.
 * 
 * Example:
 *   Traveler:RavengaardCity:1:circle-exit
 *   Traveler:RavengaardCity:2:circle-entry
 *   Traveler:RavengaardCity:3:circle-entry
 * 
 * Tokens stepping on 2 or 3 will go to 1. Node 1 acts as the anchor and does not teleport out.
 * 
 * Note:
 *   You can never enter a teleportation circle exit.
 *   You can also use the circles in the following way (not applicable for the other modes):
 *   Traveler:RavengaardCity:1:circle-exit
 *   Traveler:RavengaardCity:1:circle-entry
 *   Traveler:RavengaardCity:1:circle-entry
 * 
 * Tokens stepping on any of the 1:circle-entry will be teleported/moved to 1:circle-exit
 * I made it this way to make sure if you have multiple teleportation circles in a city,
 * you can keep track of which one to go to.
 * 
 * -----------------------------------------------------------------
 * 
 * TokenTraveler v1.3 (Better Messaging)
 *  Updated teleport messaging to look nicer and easier to read.
 * 
 * TokenTraveler v1.3.1 (Better Messaging)
 *  Code cleanup to make it easier to re-use components, more readable, etc.
 * 
 * -----------------------------------------------------------------
 * 
 * TokenTraveler v1.4 (Camera Follow)
 *  The player camera now follows the token both on the same map and on different maps
 *  Requirement for this to happen: In the controlled by field, you need to select the player who controls the token
 * 
 *  Notes: The GM map will not follow/change unless the GM joins as a player, I wasn't sure if it would be a requirement,
 *  but for me it seemed more logical to leave the GM camera on the same map with the possible other players.
 */

/**
 * TokenTraveler v1.4 – Camera Follow (Scoped)
 * Full version with wrapped, per-player camera pings
 */

// ---------------------------------------------------------------------------
// State init
// ---------------------------------------------------------------------------
function initializeState() {
    state.TokenTraveler = state.TokenTraveler || {};
    state.TokenTraveler.cooldown = state.TokenTraveler.cooldown || {};
    state.TokenTraveler.notifications = state.TokenTraveler.notifications ?? true;
}

on('ready', () => {
    log('🧭 TokenTraveler v1.4.1 initialized.');
    initializeState();
});

// ---------------------------------------------------------------------------
// GM Notifications
// ---------------------------------------------------------------------------
function notifyGM(icon, color, name, group, extra = '', highlight = '') {
    const safeHighlight = highlight.replace(/(\r\n|\n|\r)/gm, ' ');
    sendChat(
        'TokenTraveler',
        `/w gm <br>${icon} <b style="color:${color};">${name}</b> <br>${extra} <b>${group}</b>${safeHighlight ? ' ' + safeHighlight : ''}`
    );
}

// ---------------------------------------------------------------------------
// Chat Commands
// ---------------------------------------------------------------------------
function setNotifications(enabled) {
    state.TokenTraveler.notifications = enabled;
    sendChat(
        'TokenTraveler',
        `/w gm ${enabled ? '🔔 Notifications enabled.' : '🔕 Notifications disabled.'}`
    );
}

on('chat:message', (msg) => {
    if (msg.type !== 'api' || !playerIsGM(msg.playerid)) return;
    initializeState();

    const [command, ...args] = msg.content.split(/\s+/);
    if (command !== '!TokenTraveler') return;

    if (args.includes('--notification-on')) setNotifications(true);
    if (args.includes('--notification-off')) setNotifications(false);
});

// ---------------------------------------------------------------------------
// Cooldown Handling
// ---------------------------------------------------------------------------
function applyCooldown(id, name, duration = 1500) {
    state.TokenTraveler.cooldown[id] = true;
    if (name) state.TokenTraveler.cooldown[name] = true;
    setTimeout(() => {
        delete state.TokenTraveler.cooldown[id];
        if (name) delete state.TokenTraveler.cooldown[name];
    }, duration);
}

function hasCooldown(id, name) {
    return state.TokenTraveler.cooldown[id] || (name && state.TokenTraveler.cooldown[name]);
}

// ---------------------------------------------------------------------------
// Traveler Name Parser
// ---------------------------------------------------------------------------
function parseTravelerName(name) {
    const parts = (name || '').split(':').map(p => p.trim());
    return {
        isTraveler: parts[0] === 'Traveler',
        groupName: parts[1] || 'Unknown',
        nodeId: parseInt(parts[2]) || 0,
        mode: (parts[3] || 'ascending').toLowerCase()
    };
}

// ---------------------------------------------------------------------------
// Sequence Logic
// ---------------------------------------------------------------------------
function getNextNode(groupNodes, currentIndex, mode, nodeId, total) {
    switch (mode) {
        case 'circle-entry':
            return (
                groupNodes.find(n => n.id === nodeId && n.mode === 'circle-exit') ||
                groupNodes.find(n => n.mode === 'circle-exit')
            );
        case 'circle-exit':
            return null;
        case 'descending':
            return groupNodes[(currentIndex - 1 + total) % total];
        case 'random': {
            let idx;
            do idx = Math.floor(Math.random() * total);
            while (idx === currentIndex);
            return groupNodes[idx];
        }
        case 'odd-even': {
            const isOdd = nodeId % 2 !== 0;
            const subset = groupNodes.filter(n => (n.id % 2 !== 0) === isOdd);
            const next = subset[(subset.findIndex(n => n.id === nodeId) + 1) % subset.length];
            return groupNodes.find(n => n.id === next.id);
        }
        default:
            return groupNodes[(currentIndex + 1) % total];
    }
}

// ---------------------------------------------------------------------------
// Token Cloning
// ---------------------------------------------------------------------------
function cloneTokenToPage(obj, destPageId, x, y) {
    const attrs = obj.attributes;
    const cloneData = { _type: 'graphic', _pageid: destPageId };

    Object.keys(attrs).forEach(key => {
        if (['_id', '_type', '_pageid', '_zorder'].includes(key)) return;
        cloneData[key] = attrs[key];
    });

    cloneData.left = x;
    cloneData.top = y;
    cloneData.layer = cloneData.layer || 'objects';
    cloneData.name = cloneData.name?.trim() || obj.get('name') || 'Unnamed Token';
    cloneData.imgsrc = cloneData.imgsrc || obj.get('imgsrc');

    return createObj('graphic', cloneData);
}

// ---------------------------------------------------------------------------
// Controller Resolution
// ---------------------------------------------------------------------------
function getTokenControllerIds(token) {
    let ids = [];

    const add = val => {
        if (val && val.trim()) ids.push(...val.split(',').map(v => v.trim()));
    };

    add(token.get('controlledby'));

    const charId = token.get('represents');
    if (charId) {
        const char = getObj('character', charId);
        if (char) add(char.get('controlledby'));
    }

    return [...new Set(ids)];
}

// ---------------------------------------------------------------------------
// 🆕 Camera Utilities (WRAPPED PING)
// ---------------------------------------------------------------------------
function focusPlayerCamera(playerId, pageId, x, y) {
    sendPing(x, y, pageId, playerId, false); // 🔒 scoped ping
}

// Same-map camera follow
function panPlayerCameraToToken(token) {
    const controllers = getTokenControllerIds(token);
    if (!controllers.length) return;

    const x = token.get('left');
    const y = token.get('top');
    const pageId = token.get('pageid');

    controllers.forEach(pid => {
        focusPlayerCamera(pid, pageId, x, y);
    });
}

// Cross-map teleport camera follow
function movePlayerToPageAndFocus(token, destPageId, destX, destY) {
    const controllers = getTokenControllerIds(token);
    if (!controllers.length) return;

    const groupPageId = Campaign().get('playerpageid');
    let playerPages = Campaign().get('playerspecificpages') || {};

    controllers.forEach(pid => {
        let tempPages = { ...playerPages };
        tempPages[pid] = token.get('pageid');
        Campaign().set('playerspecificpages', tempPages);

        setTimeout(() => {
            let newPages = Campaign().get('playerspecificpages') || {};
            if (destPageId === groupPageId) {
                delete newPages[pid];
            } else {
                newPages[pid] = destPageId;
            }
            Campaign().set('playerspecificpages', newPages);

            setTimeout(() => {
                focusPlayerCamera(pid, destPageId, destX, destY);
            }, 600);
        }, 600);
    });
}

// ---------------------------------------------------------------------------
// Main Teleport Logic
// ---------------------------------------------------------------------------
on('change:graphic', (obj) => {
    initializeState();

    if (obj.get('subtype') !== 'token') return;
    if ((obj.get('name') || '').startsWith('Traveler:')) return;

    if (hasCooldown(obj.id, obj.get('name'))) return;

    const travelers = findObjs({ _type: 'graphic' })
        .filter(g => (g.get('name') || '').startsWith('Traveler:'));

    const tokenX = obj.get('left');
    const tokenY = obj.get('top');
    const pageId = obj.get('pageid');

    travelers.forEach(traveler => {
        if (traveler.get('pageid') !== pageId) return;

        const inX = tokenX > (traveler.get('left') - traveler.get('width') / 2) &&
                    tokenX < (traveler.get('left') + traveler.get('width') / 2);
        const inY = tokenY > (traveler.get('top') - traveler.get('height') / 2) &&
                    tokenY < (traveler.get('top') + traveler.get('height') / 2);
        if (!inX || !inY) return;

        const { groupName, nodeId, mode } = parseTravelerName(traveler.get('name'));

        const groupNodes = travelers
            .filter(t => (t.get('name') || '').includes(groupName))
            .map(t => {
                const p = t.get('name').split(':').map(x => x.trim());
                return {
                    id: parseInt(p[2]) || 0,
                    obj: t,
                    pageid: t.get('pageid'),
                    mode: (p[3] || 'ascending').toLowerCase()
                };
            })
            .sort((a, b) => a.id - b.id);

        const currentIndex = groupNodes.findIndex(n => n.id === nodeId);
        const nextNode = getNextNode(groupNodes, currentIndex, mode, nodeId, groupNodes.length);
        if (!nextNode) return;

        applyCooldown(obj.id, obj.get('name'));

        if (nextNode.pageid !== pageId) {
            const clone = cloneTokenToPage(
                obj,
                nextNode.pageid,
                nextNode.obj.get('left'),
                nextNode.obj.get('top')
            );
            if (clone) {
                obj.remove();
                movePlayerToPageAndFocus(
                    clone,
                    nextNode.pageid,
                    nextNode.obj.get('left'),
                    nextNode.obj.get('top')
                );
            }
        } else {
            obj.set({
                left: nextNode.obj.get('left'),
                top: nextNode.obj.get('top')
            });
            panPlayerCameraToToken(obj);
        }
    });
});
