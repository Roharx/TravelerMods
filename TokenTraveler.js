/**
 * Documentation: TokenTraveler v1.3 Better Messages
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
 */

on('ready', () => {
    log('TokenTraveler v1.3 ready (Better Messages).');

    if (!state.TokenTraveler)
        state.TokenTraveler = { cooldown: {}, notifications: true };
    if (state.TokenTraveler.notifications === undefined)
        state.TokenTraveler.notifications = true;
});

// ---------------------------------------------------------------------------
// Chat command handler
// ---------------------------------------------------------------------------
on('chat:message', (msg) => {
    if (msg.type !== 'api' || !playerIsGM(msg.playerid)) return;

    if (!state.TokenTraveler)
        state.TokenTraveler = { cooldown: {}, notifications: true };

    const args = msg.content.split(/\s+/);
    if (args[0] !== '!TokenTraveler') return;

    if (args.includes('--notification-off')) {
        state.TokenTraveler.notifications = false;
        sendChat('TokenTraveler', '/w gm 📴 Notifications disabled.');
    } else if (args.includes('--notification-on')) {
        state.TokenTraveler.notifications = true;
        sendChat('TokenTraveler', '/w gm 🔔 Notifications enabled.');
    }
});

// ---------------------------------------------------------------------------
// Main teleportation logic
// ---------------------------------------------------------------------------
on('change:graphic', (obj, prev) => {
    if (!state.TokenTraveler)
        state.TokenTraveler = { cooldown: {}, notifications: true };

    if (obj.get('subtype') !== 'token') return;
    if ((obj.get('name') || '').startsWith('Traveler:')) return;

    const tokenId = obj.id;
    if (state.TokenTraveler.cooldown[tokenId] ||
        state.TokenTraveler.cooldown[obj.get('name')]) return;

    const pageId = obj.get('pageid');
    const travelers = findObjs({ _type: 'graphic' })
        .filter(g => (g.get('name') || '').startsWith('Traveler:'));

    const tokenX = obj.get('left');
    const tokenY = obj.get('top');

    travelers.forEach(traveler => {
        const tLeft = traveler.get('left');
        const tTop = traveler.get('top');
        const tW = traveler.get('width');
        const tH = traveler.get('height');
        const tPageId = traveler.get('pageid');
        if (tPageId !== pageId) return;

        const inX = tokenX > (tLeft - tW / 2) && tokenX < (tLeft + tW / 2);
        const inY = tokenY > (tTop - tH / 2) && tokenY < (tTop + tH / 2);
        if (!(inX && inY)) return;

        const parts = traveler.get('name').split(':').map(p => p.trim());
        const groupName = parts[1] || 'Unknown';
        const nodeId = parseInt(parts[2]) || 0;
        const mode = (parts[3] || 'ascending').toLowerCase();

        // Find all group nodes
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
        const total = groupNodes.length;
        let nextNode = null;

        // Original sequence logic
        let nextIndex = 0;
        switch (mode) {
            case 'descending':
                nextIndex = (currentIndex - 1 + total) % total;
                break;
            case 'random':
                do {
                    nextIndex = Math.floor(Math.random() * total);
                } while (nextIndex === currentIndex);
                break;
            case 'odd-even': {
                const isOdd = nodeId % 2 !== 0;
                const subset = groupNodes.filter(n => (n.id % 2 !== 0) === isOdd);
                const currentSubIndex = subset.findIndex(n => n.id === nodeId);
                const nextSubIndex = (currentSubIndex + 1) % subset.length;
                const nextNodeId = subset[nextSubIndex].id;
                nextIndex = groupNodes.findIndex(n => n.id === nextNodeId);
                break;
            }
            // 🌀 NEW: Linked Circle logic
            case 'circle-entry': {
                // Try to find a matching exit with same ID
                nextNode = groupNodes.find(n => n.id === nodeId && n.mode === 'circle-exit');
                if (!nextNode) {
                    // fallback: first available exit
                    nextNode = groupNodes.find(n => n.mode === 'circle-exit');
                }
                if (!nextNode) return sendChat('TokenTraveler', `/w gm ⚠️ No circle-exit found for ${groupName}.`);
            }
            case 'circle-exit': {
                // Exits do nothing
                return;
            }
            default:
                nextIndex = (currentIndex + 1) % total;
        }
        nextNode = groupNodes[nextIndex];


        if (!nextNode) return;

        // Apply cooldown immediately
        state.TokenTraveler.cooldown[tokenId] = true;
        const tokenName = obj.get('name');
        if (tokenName) {
            state.TokenTraveler.cooldown[tokenName] = true;
            setTimeout(() => delete state.TokenTraveler.cooldown[tokenName], 1500);
        }

        // Announce both
        if (state.TokenTraveler.notifications) {
            // Messages need to be in 1 line or Roll20 will treat them as a new message, otherwise, I'd split it up into multiple lines
            sendChat('TokenTraveler',
                `/w gm <br> 🌀 <b style="color:#60A5FA;">${obj.get('name') || 'Unnamed Token'}</b> entered <b>${groupName}</b> <br> <span style="color:#93C5FD;">Node:</span> ${nodeId} | <span style="color:#93C5FD;">Mode:</span> ${mode}`);

            // Messages need to be in 1 line or Roll20 will treat them as a new message, otherwise, I'd split it up into multiple lines
            sendChat('TokenTraveler',
                `/w gm <br> 🚪 <b style="color:#FBBF24;">${obj.get('name') || 'Unnamed Token'}</b> exited <b>${groupName}</b> <span style="color:#FCD34D;">Next Node:</span> ${nextNode.id}`);
        }

        // Handle cross-map teleport
        if (nextNode.pageid !== pageId) {
            const destPageId = nextNode.pageid;
            const attrs = obj.attributes;
            const cloneData = { _type: 'graphic', _pageid: destPageId };

            Object.keys(attrs).forEach(key => {
                if (['_id', '_type', '_pageid', '_zorder'].includes(key)) return;
                cloneData[key] = attrs[key];
            });

            cloneData.left = nextNode.obj.get('left');
            cloneData.top = nextNode.obj.get('top');
            cloneData.layer = cloneData.layer || 'objects';
            cloneData.name = cloneData.name && cloneData.name.trim() !== '' ? cloneData.name : obj.get('name') || 'Unnamed Token';
            cloneData.imgsrc = cloneData.imgsrc || obj.get('imgsrc');

            const clone = createObj('graphic', cloneData);
            if (clone) {
                obj.remove();

                // Get the name of the destination map
                const destPage = getObj('page', destPageId);
                const destMapName = destPage ? destPage.get('name') : '(Unknown Map)';

                if (state.TokenTraveler.notifications) {
                    // Messages need to be in 1 line or Roll20 will treat them as a new message, otherwise, I'd split it up into multiple lines
                    sendChat('TokenTraveler',
                        `/w gm <br> ✨ <b style="color:#C084FC;">${clone.get('name') || '(Unnamed Token)'}</b> teleported to <b style="color:#A78BFA;">${destMapName}</b> <br> <span style="color:#DDD6FE;">${groupName}:</span> <br> <span style="color:#93C5FD;">Node:</span> ${nextNode.id} | <span style="color:#93C5FD;">Mode:</span> ${mode}`);
                }
            } else {
                sendChat('TokenTraveler', `/w gm ⚠️ Failed to clone ${obj.get('name') || 'token'} to ${groupName} Node ${nextNode.id}.`);
            }
        } else {
            obj.set({
                left: nextNode.obj.get('left'),
                top: nextNode.obj.get('top')
            });
        }

        // Remove cooldown
        setTimeout(() => delete state.TokenTraveler.cooldown[tokenId], 1500);
    });
});