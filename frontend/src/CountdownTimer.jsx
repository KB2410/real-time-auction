import { useState, useEffect } from 'react';

const CountdownTimer = ({ initialEndTime, socket }) => {
    // Store the end time in state so we can update it dynamically
    const [endTime, setEndTime] = useState(initialEndTime);
    const [timeLeft, setTimeLeft] = useState("");

    // Hook 1: Listen for the Anti-Sniper WebSockets
    useEffect(() => {
        if (!socket) return;

        socket.on('time_extended', (data) => {
            console.log("🚨 Anti-sniping triggered! Adding 5 minutes.");
            // Update the target time with the new timestamp from the smart contract
            setEndTime(data.newEndTime);
        });

        // Cleanup listener on unmount
        return () => socket.off('time_extended');
    }, [socket]);

    // Hook 2: The actual ticking clock
    useEffect(() => {
        const timerInterval = setInterval(() => {
            // Get current time in seconds to match blockchain Unix timestamps
            const now = Math.floor(Date.now() / 1000);
            const distance = endTime - now;

            if (distance <= 0) {
                setTimeLeft("Auction Ended");
                clearInterval(timerInterval);
            } else {
                const minutes = Math.floor(distance / 60);
                const seconds = distance % 60;
                // Format nicely like "05:09"
                setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [endTime]); // Re-run this effect if the endTime changes!

    return (
        <div style={{
            padding: '15px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '8px',
            border: '2px solid #f5c6cb',
            display: 'inline-block'
        }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>⏱️ Time Remaining</h3>
            <h1 style={{ margin: 0, fontSize: '36px', fontFamily: 'monospace' }}>
                {timeLeft}
            </h1>
            {/* Optional: A little badge to show the user that anti-sniping is active */}
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                *Bids in the last 5 mins extend the timer
            </p>
        </div>
    );
};

export default CountdownTimer;
