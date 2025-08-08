import React, { useState, useEffect, useContext } from 'react';
import { GameContext } from '../context/GameContext';

const styles = {
  loansSection: {
    marginTop: '15px',
    color: '#333'
  },
  formGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 500,
    color: 'white'
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
    color: '#333'
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    color: '#333'
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  successButton: {
    backgroundColor: '#28a745',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  loanCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
  },
  activeLoanCard: {
    borderLeft: '4px solid #17a2b8',
  },
  loanActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px'
  }
};

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
    if (!selectedLender || !loanAmount || loanAmount <= 0) return;
    
    const loanData = {
      fromPlayerId: player?.socketId,
      toPlayerId: selectedLender,
      amount: Number(loanAmount),
      interestRate: Number(interestRate),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    socket.emit('requestPersonalLoan', loanData);
    setLoanAmount(0);
    setSelectedLender('');
  };
  
  const handleCancelRequest = (loanId) => {
    socket.emit('cancelLoanRequest', { loanId });
  };
  
  const handleRespondToLoan = (loanId, accepted) => {
    socket.emit('respondToLoan', { 
      loanId, 
      accepted,
      fromPlayerId: player?.socketId
    });
  };
  
  const handleReturnLoan = (loanId, amount) => {
    socket.emit('returnLoan', { loanId, amount });
  };
  
  const otherPlayers = players.filter(p => p.socketId !== player?.socketId);
  const myActiveLoans = activeLoans.filter(loan => 
    loan.borrowerId === player?.socketId || loan.lenderId === player?.socketId
  );

  return (
    <div style={styles.loansSection}>
      <h3>Request a Personal Loan</h3>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Amount to Request:</label>
        <input 
          type="number" 
          value={loanAmount}
          onChange={(e) => setLoanAmount(Number(e.target.value))}
          min="1"
          placeholder="Enter amount"
          style={styles.input}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Interest Rate (%):</label>
        <input 
          type="number" 
          value={interestRate}
          onChange={(e) => setInterestRate(Number(e.target.value))}
          min="1"
          max="50"
          placeholder="Interest rate"
          style={styles.input}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>From Player:</label>
        <select 
          value={selectedLender}
          onChange={(e) => setSelectedLender(e.target.value)}
          style={styles.select}
        >
          <option value="">Select a player</option>
          {otherPlayers.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} (${p.money})
            </option>
          ))}
        </select>
      </div>

      <button 
        onClick={handleRequestLoan}
        disabled={!loanAmount || !selectedLender || loanAmount <= 0}
        style={styles.button}
      >
        Request Loan
      </button>

      <h4>Your Loan Requests</h4>
      {loanRequests.length === 0 ? (
        <p>No pending loan requests</p>
      ) : (
        loanRequests.map(loan => (
          <div key={loan.id} style={{...styles.loanCard, ...(loan.status === 'active' ? styles.activeLoanCard : {})}}>
            <div>To: {loan.toPlayerName}</div>
            <div>Amount: ${loan.amount}</div>
            <div>Interest: {loan.interestRate}%</div>
            <div>Status: {loan.status}</div>
            {loan.status === 'pending' && (
              <button 
                onClick={() => handleCancelRequest(loan.id)}
                style={{...styles.button, ...styles.dangerButton}}
              >
                Cancel
              </button>
            )}
          </div>
        ))
      )}

      <h4>Active Loans</h4>
      {myActiveLoans.length === 0 ? (
        <p>No active loans</p>
      ) : (
        myActiveLoans.map(loan => (
          <div key={loan.id} style={{...styles.loanCard, ...styles.activeLoanCard}}>
            <div>
              {loan.borrowerId === player?.id ? 'Borrowed from' : 'Lent to'}: 
              {loan.borrowerId === player?.id ? loan.lenderName : loan.borrowerName}
            </div>
            <div>Amount: ${loan.amount}</div>
            <div>To return: ${loan.returnAmount}</div>
            <div>Status: {loan.status}</div>
            
            {loan.status === 'active' && loan.borrowerId === player?.id && (
              <div style={styles.loanActions}>
                <button 
                  onClick={() => handleReturnLoan(loan.id, loan.returnAmount)}
                  style={styles.button}
                >
                  Return ${loan.returnAmount}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default PersonalLoans;
