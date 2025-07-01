import React from 'react';

const PlayerStats = ({ player }) => {
    return (
        <div className="playerstats">
            <h2>{player.name}'s Stats</h2>
            <p>Strength: {player.strength}</p>
            <p>Agility: {player.agility}</p>
            <p>Intelligence: {player.intelligence}</p>
        </div>
    );
};

export default PlayerStats;