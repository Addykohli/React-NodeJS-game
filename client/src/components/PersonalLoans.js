import React, { useState, useEffect, useContext } from 'react';
import { GameContext } from '../context/GameContext';

const LoansSection = styled.div`
  margin-top: 15px;
  color: #333;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: white;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  background-color: rgba(255, 255, 255, 0.8);
  color: #333;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  background-color: rgba(255, 255, 255, 0.8);
  color: #333;
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-right: 10px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #0056b3;
  }
  
  &:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
`;

const DangerButton = styled(Button)`
  background-color: #dc3545;
  
  &:hover {
    background-color: #a71d2a;
  }
`;

const SuccessButton = styled(Button)`
  background-color: #28a745;
  
  &:hover {
    background-color: #1e7e34;
  }
`;

const LoanRequest = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
`;

const ActiveLoan = styled(LoanRequest)`
  border-left: 4px solid #17a2b8;
`;

const LoanActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
`;

const PersonalLoans = () => {
  const { socket, player, players } = useContext(GameContext);
  
  const [loanAmount, setLoanAmount] = useState(0);
  const [interestRate, setInterestRate] = useState(10);
  const [selectedLender, setSelectedLender] = useState('');
  const [loanRequests, setLoanRequests] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);

  // Handle loan requests and updates
  useEffect(() => {
    if (!socket) return;

    const handleLoanRequested = (loan) => {
      if (loan.toPlayerId === player?.socketId) {
        setLoanRequests(prev => [...prev, loan]);
      }
    };

    const handleLoanAccepted = (loan) => {
      setLoanRequests(prev => prev.filter(req => req.id !== loan.id));
      setActiveLoans(prev => [...prev, loan]);
    };

    const handleLoanRejected = ({ loanId }) => {
      setLoanRequests(prev => prev.filter(req => req.id !== loanId));
    };

    const handleLoanReturned = (loan) => {
      setActiveLoans(prev => prev.filter(l => l.id !== loan.id));
    };

    const handleLoanError = ({ error }) => {
      alert(`Loan Error: ${error}`);
    };

    // Socket event listeners
    socket.on('loanRequested', handleLoanRequested);
    socket.on('loanAccepted', handleLoanAccepted);
    socket.on('loanRejected', handleLoanRejected);
    socket.on('loanReturned', handleLoanReturned);
    socket.on('loanError', handleLoanError);

    // Cleanup
    return () => {
      socket.off('loanRequested', handleLoanRequested);
      socket.off('loanAccepted', handleLoanAccepted);
      socket.off('loanRejected', handleLoanRejected);
      socket.off('loanReturned', handleLoanReturned);
      socket.off('loanError', handleLoanError);
    };
  }, [socket, player]);

  const handleRequestLoan = () => {
    if (!loanAmount || !selectedLender || loanAmount <= 0) return;
    
    socket.emit('requestPersonalLoan', {
      toPlayerId: selectedLender,
      amount: parseInt(loanAmount),
      interest: parseInt(interestRate)
    });
    
    setLoanAmount(0);
    setSelectedLender('');
  };

  const handleRespondToLoan = (loanId, accept) => {
    socket.emit('respondToLoan', { loanId, accept });
    setLoanRequests(prev => prev.filter(req => req.id !== loanId));
  };

  const handleReturnLoan = (loanId) => {
    socket.emit('returnLoan', { loanId });
  };

  // Get other players for loan requests
  const otherPlayers = players?.filter(p => p.socketId !== player?.socketId) || [];
  const myActiveLoans = activeLoans.filter(loan => 
    loan.fromPlayerId === player?.socketId || loan.toPlayerId === player?.socketId
  );

  return (
    <LoansSection>
      <h2>Personal Loans</h2>
      
      {/* Request Loan Section */}
      <div className="loan-request-section">
        <h3>Request a Loan</h3>
        <FormGroup>
          <Label>Lender:</Label>
          <Select 
            value={selectedLender}
            onChange={(e) => setSelectedLender(e.target.value)}
          >
            <option value="">Select a player</option>
            {otherPlayers.map(p => (
              <option key={p.socketId} value={p.socketId}>
                {p.name} (${p.money})
              </option>
            ))}
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label>Amount:</Label>
          <Input
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            min="1"
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Interest Rate: {interestRate}%</Label>
          <Input
            type="range"
            min="5"
            max="50"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
          />
        </FormGroup>
        
        <Button 
          onClick={handleRequestLoan}
          disabled={!selectedLender || !loanAmount || loanAmount <= 0}
        >
          Request Loan
        </Button>
      </div>
      
      {/* Pending Requests */}
      {loanRequests.length > 0 && (
        <div className="loan-requests">
          <h3>Loan Requests</h3>
          {loanRequests.map(request => {
            const fromPlayer = players.find(p => p.socketId === request.fromPlayerId);
            return (
              <LoanRequest key={request.id}>
                <p>
                  {fromPlayer?.name || 'Unknown player'} 
                  wants to lend you ${request.amount} 
                  (Return: ${request.returnAmount})
                </p>
                <LoanActions>
                  <SuccessButton 
                    onClick={() => handleRespondToLoan(request.id, true)}
                  >
                    Accept
                  </SuccessButton>
                  <DangerButton 
                    onClick={() => handleRespondToLoan(request.id, false)}
                  >
                    Reject
                  </DangerButton>
                </LoanActions>
              </LoanRequest>
            );
          })}
        </div>
      )}
      
      {/* Active Loans */}
      {myActiveLoans.length > 0 && (
        <div className="active-loans">
          <h3>Active Loans</h3>
          {myActiveLoans.map(loan => {
            const isLender = loan.fromPlayerId === player?.socketId;
            const otherPlayerId = isLender ? loan.toPlayerId : loan.fromPlayerId;
            const otherPlayer = players.find(p => p.socketId === otherPlayerId);
            
            return (
              <ActiveLoan key={loan.id}>
                <p>
                  {isLender ? 'You lent' : 'You borrowed'} 
                  ${loan.amount} at {((loan.returnAmount / loan.amount - 1) * 100).toFixed(0)}% interest
                  {otherPlayer && ` ${isLender ? 'to' : 'from'} ${otherPlayer.name}`}
                </p>
                <p>To return: ${loan.returnAmount}</p>
                
                {!isLender && (
                  <Button 
                    onClick={() => handleReturnLoan(loan.id)}
                    disabled={player?.money < loan.returnAmount}
                  >
                    Return ${loan.returnAmount}
                  </Button>
                )}
              </ActiveLoan>
            );
          })}
        </div>
      )}
    </LoansSection>
  );
};

export default PersonalLoans;
