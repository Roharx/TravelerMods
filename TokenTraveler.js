/**
 * Documentation: TokenTraveler v0.7 (multi-map teleportation)
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
 */

on('ready', () => {
    log('TokenTraveler v0.7 ready (multi-map teleportation).');

    // Persistent state for cooldowns
    if (!state.TokenTraveler) state.TokenTraveler = { cooldown: {} };
});

on('change:graphic', (obj, prev) => {
    // Only trigger for actual tokens (not traveler markers)
    if (obj.get('subtype') !== 'token') return;
    if (obj.get('name').startsWith('Traveler:')) return;

    const tokenId = obj.id;
    if (state.TokenTraveler.cooldown[tokenId]) return; // prevent re-trigger loop

    const pageId = obj.get('pageid');
    const travelers = findObjs({
        _type: 'graphic'
    }).filter(g => g.get('name').startsWith('Traveler:')); // get from all pages

    const tokenX = obj.get('left');
    const tokenY = obj.get('top');

    travelers.forEach(traveler => {
        const tLeft = traveler.get('left');
        const tTop = traveler.get('top');
        const tW = traveler.get('width');
        const tH = traveler.get('height');
        const tPageId = traveler.get('pageid');

        if (tPageId !== pageId) return; // only detect on current map

        const inX = tokenX > (tLeft - tW / 2) && tokenX < (tLeft + tW / 2);
        const inY = tokenY > (tTop - tH / 2) && tokenY < (tTop + tH / 2);

        if (inX && inY) {
            const parts = traveler.get('name').split(':').map(p => p.trim());
            const groupName = parts[1] || 'Unknown';
            const nodeId = parseInt(parts[2]) || 0;

            // Find and sort all nodes in this group (across all pages)
            const groupNodes = travelers
                .filter(t => {
                    const p = t.get('name').split(':').map(x => x.trim());
                    return p[1] === groupName;
                })
                .map(t => {
                    const p = t.get('name').split(':').map(x => x.trim());
                    return {
                        id: parseInt(p[2]) || 0,
                        obj: t,
                        pageid: t.get('pageid')
                    };
                })
                .sort((a, b) => a.id - b.id);

            const currentIndex = groupNodes.findIndex(n => n.id === nodeId);
            const nextIndex = (currentIndex + 1) % groupNodes.length;
            const nextNode = groupNodes[nextIndex];

            // Announce both
            sendChat('TokenTraveler', `/w gm ${obj.get('name')} entered ${groupName} (Node ${nodeId})`);
            sendChat('TokenTraveler', `/w gm ${obj.get('name')} exited ${groupName} (Node ${nextNode.id})`);

            // Apply cooldown immediately
            state.TokenTraveler.cooldown[tokenId] = true;

            // Handle cross-map teleport
            if (nextNode.pageid !== pageId) {
                const destPageId = nextNode.pageid;

                // Clone the token on the new page
                const clone = createObj('graphic', {
                    _pageid: destPageId,
                    imgsrc: obj.get('imgsrc'),
                    name: obj.get('name'),
                    left: nextNode.obj.get('left'),
                    top: nextNode.obj.get('top'),
                    width: obj.get('width'),
                    height: obj.get('height'),
                    layer: 'objects',
                    represents: obj.get('represents'),
                    controlledby: obj.get('controlledby')
                });

                // Delete the old token
                obj.remove();

                sendChat('TokenTraveler', `/w gm ${clone.get('name')} teleported to a new map (${groupName} Node ${nextNode.id}).`);
            } else {
                // Same map — just move the token
                obj.set({
                    left: nextNode.obj.get('left'),
                    top: nextNode.obj.get('top')
                });
            }

            // Remove cooldown after 1.5 seconds
            setTimeout(() => {
                delete state.TokenTraveler.cooldown[tokenId];
            }, 1500); //<--------- You can change the cooldown time here (in millisecounds, default: 1500)
        }
    });
});
