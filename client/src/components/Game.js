import LeaveGameButton from './LeaveGameButton';

const Game = () => {
  useEffect(() => {
    socket.on('playerLeft', ({ playerName, remainingPlayers }) => {
      toast.info(`${playerName} has left the game.`);
      setPlayers(remainingPlayers);
    });

    socket.on('gameReset', () => {
      toast.info('Game has been reset as all players left.');
      navigate('/');
    });

    return () => {
      socket.off('playerLeft');
      socket.off('gameReset');
    };
  }, [socket, navigate]);

  return (
    <div>
      <LeaveGameButton />
    </div>
  );
};

export default Game; 