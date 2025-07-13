const { tiles } = require('../data/tiles.cjs');

class GameEngine {
  constructor(sessionDoc = null) {
    this.session = sessionDoc || {
      players: [],
      currentPlayerIndex: 0,
      history: [],
      started: false
    };
  }

  addPlayer(player) {
    this.session.players.push({ ...player });
  }

  removePlayer(socketId) {
    this.session.players = this.session.players.filter(p => p.socketId !== socketId);
    if (this.session.currentPlayerIndex >= this.session.players.length) {
      this.session.currentPlayerIndex = 0;
    }
  }

  getPlayer(socketId) {
    return this.session.players.find(p => p.socketId === socketId) || null;
  }

  rollDice(socketId) {
    const die1 = Math.ceil(Math.random() * 6);
    const die2 = Math.ceil(Math.random() * 6);
    const total = die1 + die2;
    console.log(`[Engine] ${socketId} rolled ${die1}+${die2} = ${total}`);
    this.session.history.push({
      playerSocketId: socketId,
      action: 'roll',
      details: { die1, die2, total }
    });
    return { die1, die2, total };
  }


  moveOneStep(socketId, initialTotal) {
    const player = this.getPlayer(socketId);
    if (!player) return null;

    const current = player.tileId;
    const prev    = player.prevTile;
    const tile    = tiles.find(t => t.id === current);
    const candidates = (tile.next || []).filter(n =>
      (n.from === prev || n.from === null)
    );

    console.log(`[Engine] moveOneStep: total=${initialTotal}, from=${prev}, candidates=`, candidates);

    if (candidates.length === 0) {
      console.log('[Engine] → no candidates, stuck');
      return null;
    }

    const anyC = candidates.find(n => n.roll === 'any');
    if (anyC) {
      console.log('[Engine] → ANY to', anyC.to);
      player.prevTile = current;
      player.tileId   = anyC.to;
      this.session.history.push({
        playerSocketId: socketId,
        action: 'move',
        details: { to: anyC.to, steps: 1 }
      });
      return { tileId: anyC.to };
    }

    if (initialTotal < 7) {
      const belowC = candidates.find(n => n.roll === 'below');
      if (belowC) {
        console.log('[Engine] → BELOW to', belowC.to);
        player.prevTile = current;
        player.tileId   = belowC.to;
        this.session.history.push({
          playerSocketId: socketId,
          action: 'move',
          details: { to: belowC.to, steps: 1 }
        });
        return { tileId: belowC.to };
      }
    } else if (initialTotal > 7) {
      const aboveC = candidates.find(n => n.roll === 'above');
      if (aboveC) {
        console.log('[Engine] → ABOVE to', aboveC.to);
        player.prevTile = current;
        player.tileId   = aboveC.to;
        this.session.history.push({
          playerSocketId: socketId,
          action: 'move',
          details: { to: aboveC.to, steps: 1 }
        });
        return { tileId: aboveC.to };
      }
    }

    if (initialTotal === 7) {
      const forks = candidates.filter(n => n.roll === 'above' || n.roll === 'below');
      if (forks.length > 1) {
        console.log('[Engine] → BRANCH choices', forks.map(f => f.to));
        return { branchChoices: forks.map(f => ({ to: f.to })) };
      }
    }

    const fallback = candidates[0];
    console.log('[Engine] → FALLBACK to', fallback.to);
    player.prevTile = current;
    player.tileId   = fallback.to;
    this.session.history.push({
      playerSocketId: socketId,
      action: 'move',
      details: { to: fallback.to, steps: 1 }
    });
    return { tileId: fallback.to };
  }

  chooseBranch(socketId, branchChoices, branchIndex) {
    const choice = branchChoices[branchIndex];
    if (!choice) return null;
    const player = this.getPlayer(socketId);
    if (!player) return null;
    console.log(`[Engine] chooseBranch idx=${branchIndex} →`, choice.to);
    player.prevTile = player.tileId;
    player.tileId   = choice.to;
    this.session.history.push({
      playerSocketId: socketId,
      action: 'branch',
      details: { to: choice.to }
    });
    return choice.to;
  }

  endTurn() {
    const len = this.session.players.length;
    if (len === 0) return null;
    this.session.currentPlayerIndex = (this.session.currentPlayerIndex + 1) % len;
    const next = this.session.players[this.session.currentPlayerIndex].socketId;
    console.log('[Engine] endTurn → next', next);
    this.session.history.push({
      playerSocketId: next,
      action: 'endTurn',
      details: {}
    });
    return next;
  }

  getState() {
    return {
      players: this.session.players,
      currentPlayerSocketId:
        this.session.players[this.session.currentPlayerIndex]?.socketId || null,
      started: this.session.started,
      history: this.session.history
    };
  }

  findShortestPathsToPlayers(fromTileId) {
    const paths = {};
    const visited = new Set();
    const queue = [[fromTileId, [fromTileId]]];  
    const MAX_PATH_LENGTH = 50; 
    
    const playersOnSameTile = this.session.players.filter(p => 
      p.tileId === fromTileId && p.socketId !== this.session.players[this.session.currentPlayerIndex].socketId
    );
    
    if (playersOnSameTile.length > 0) {
      playersOnSameTile.forEach(player => {
        paths[player.socketId] = {
          player: player,
          path: [fromTileId],
          steps: 0
        };
      });
    }
    
    while (queue.length > 0) {
      const [currentTile, currentPath] = queue.shift();
      
      if (currentPath.length > MAX_PATH_LENGTH) continue;
      
      const playersOnTile = this.session.players.filter(p => 
        p.tileId === currentTile && 
        p.socketId !== this.session.players[this.session.currentPlayerIndex].socketId
      );
      
      if (playersOnTile.length > 0 && currentTile !== fromTileId) {
        playersOnTile.forEach(player => {
          if (!paths[player.socketId] || currentPath.length - 1 < paths[player.socketId].steps) {
            paths[player.socketId] = {
              player: player,
              path: currentPath,
              steps: currentPath.length - 1
            };
          }
        });
      }
      
      const currentTileDef = tiles.find(t => t.id === currentTile);
      if (!currentTileDef) continue;

      const nextMoves = new Set();

      if (currentTileDef.next) {
        currentTileDef.next.forEach(move => {
          nextMoves.add(move.to);
        });
      }

      tiles.forEach(tile => {
        if (tile.next) {
          tile.next.forEach(move => {
            if (move.to === currentTile) {
              nextMoves.add(tile.id);
            }
          });
        }
      });

      for (const nextTile of nextMoves) {
        if (currentPath.length >= 2 && 
            nextTile === currentPath[currentPath.length - 2]) {
          continue;
        }

        const recentMoves = currentPath.slice(-4);
        if (recentMoves.includes(nextTile)) {
          continue;
        }
        const newPath = [...currentPath, nextTile];
        queue.push([nextTile, newPath]);
      }
    }
    
    const readablePaths = {};
    let closestPlayers = [];
    let minSteps = Infinity;
    
    Object.entries(paths).forEach(([socketId, data]) => {
      const pathNames = data.path.map(tileId => {
        const tile = tiles.find(t => t.id === tileId);
        return tile.name;
      });
      
      readablePaths[data.player.name] = {
        path: pathNames.join(' -> '),
        steps: data.steps
      };
      
      if (data.steps < minSteps) {
        minSteps = data.steps;
        closestPlayers = [data.player.name];
      } else if (data.steps === minSteps) {
        closestPlayers.push(data.player.name);
      }
    });
    
    console.log('\nShortest paths to each player:');
    Object.entries(readablePaths).forEach(([playerName, data]) => {
      console.log(`shortest path to ${playerName}: ${data.path}`);
    });
    
    console.log('\nClosest player(s):', closestPlayers.join(', '), `(${minSteps} steps)`);
    
    return {
      paths: readablePaths,
      closestPlayers,
      minSteps
    };
  }
}

module.exports = GameEngine;