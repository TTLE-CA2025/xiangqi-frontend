import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
});

function ChessBoard() {
  const canvasRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [currentTurn, setCurrentTurn] = useState('red');
  const [validMoves, setValidMoves] = useState([]);
  const [pieces, setPieces] = useState(() => {
    const initialPieces = [];
    const add = (col, row, color, text) => initialPieces.push({ col, row, color, text });

    // Red side
    add(0, 9, 'red', '車'); add(1, 9, 'red', '馬'); add(2, 9, 'red', '相'); add(3, 9, 'red', '仕'); add(4, 9, 'red', '帥'); add(5, 9, 'red', '仕'); add(6, 9, 'red', '相'); add(7, 9, 'red', '馬'); add(8, 9, 'red', '車');
    add(1, 7, 'red', '炮'); add(7, 7, 'red', '炮');
    for (let i = 0; i <= 8; i += 2) add(i, 6, 'red', '兵');

    // Black side
    add(0, 0, 'black', '車'); add(1, 0, 'black', '馬'); add(2, 0, 'black', '象'); add(3, 0, 'black', '士'); add(4, 0, 'black', '將'); add(5, 0, 'black', '士'); add(6, 0, 'black', '象'); add(7, 0, 'black', '馬'); add(8, 0, 'black', '車');
    add(1, 2, 'black', '炮'); add(7, 2, 'black', '炮');
    for (let i = 0; i <= 8; i += 2) add(i, 3, 'black', '卒');

    return initialPieces;
  });
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    socket.on('move', ({ from, to }) => {
      setPieces(prev => {
        const movingPiece = prev.find(p => p.col === from.col && p.row === from.row);
        if (!movingPiece) return prev;
        return prev
          .filter(p => !(p.col === to.col && p.row === to.row && p.color !== movingPiece.color))
          .map(p => p === movingPiece ? { ...p, col: to.col, row: to.row } : p);
      });
      setCurrentTurn(currentTurn => currentTurn === 'red' ? 'black' : 'red');
      setSelected(null);
      setValidMoves([]);
    });

    socket.on('updatePlayers', (players) => {
      console.log('Danh sách người chơi trong phòng:', players);
      setPlayers(players);
    });
  }, []);

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / 60);
    const row = Math.floor(y / 60);

    const clickedPiece = pieces.find(p => p.col === col && p.row === row);

    if (selected && validMoves.some(m => m.col === col && m.row === row)) {
      socket.emit('move', {
        roomId,
        from: { col: selected.col, row: selected.row },
        to: { col, row },
      });
    } else if (clickedPiece && clickedPiece.color === currentTurn) {
      setSelected(clickedPiece);
      setValidMoves(calculateValidMoves(clickedPiece));
    } else {
      setSelected(null);
      setValidMoves([]);
    }
  };

  const calculateValidMoves = (piece) => {
    const moves = [];
    const { col, row, text, color } = piece;

    const getPiece = (col, row) => pieces.find(p => p.col === col && p.row === row);
    const isEnemy = (target) => target && target.color !== color;
    const isAcrossRiver = (r) => (color === 'red' ? r <= 4 : r >= 5);

    const directions = {
      '車': [[0, 1], [0, -1], [1, 0], [-1, 0]],
      '炮': [[0, 1], [0, -1], [1, 0], [-1, 0]],
      '馬': [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]],
      '兵': [[0, color === 'red' ? -1 : 1], [1, 0], [-1, 0]],
      '卒': [[0, color === 'black' ? 1 : -1], [1, 0], [-1, 0]],
    };

    if (text === '車') {
      directions[text].forEach(([dc, dr]) => {
        let c = col + dc;
        let r = row + dr;
        while (c >= 0 && c <= 8 && r >= 0 && r <= 9) {
          const target = getPiece(c, r);
          if (!target) {
            moves.push({ col: c, row: r });
          } else {
            if (isEnemy(target)) moves.push({ col: c, row: r });
            break;
          }
          c += dc;
          r += dr;
        }
      });
    }

    if (text === '炮') {
      directions[text].forEach(([dc, dr]) => {
        let c = col + dc;
        let r = row + dr;
        let jumped = false;
        while (c >= 0 && c <= 8 && r >= 0 && r <= 9) {
          const target = getPiece(c, r);
          if (!jumped) {
            if (!target) {
              moves.push({ col: c, row: r });
            } else {
              jumped = true;
            }
          } else {
            if (target) {
              if (isEnemy(target)) moves.push({ col: c, row: r });
              break;
            }
          }
          c += dc;
          r += dr;
        }
      });
    }

    return moves;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
  
    const cellSize = 70; // 👈 Tăng kích thước ô cờ
    const pieceRadius = 28; // 👈 Tăng kích thước quân cờ
  
    const drawBoard = () => {
        const background = new Image();
        background.src = '/images/wood-background.jpg';
      
        background.onload = () => {
          context.drawImage(background, 0, 0, canvas.width, canvas.height);
      
          // Viền ngoài bàn cờ
          context.strokeStyle = '#8b5a2b';
          context.lineWidth = 8;
          context.strokeRect(0, 0, canvas.width, canvas.height);
      
          const paddingX = 80; // Căn lề ngang
          const paddingY = 80; // Căn lề dọc
          const cols = 8;
          const rows = 9;
          const cellWidth = (canvas.width - paddingX * 2) / cols;
          const cellHeight = (canvas.height - paddingY * 2) / rows;
      
          // Vẽ ô cờ trong viền
          context.lineWidth = 2;
          context.strokeStyle = '#000';
      
          // Cột dọc
          for (let x = 0; x <= cols; x++) {
            context.beginPath();
            const xPos = paddingX + x * cellWidth;
            context.moveTo(xPos, paddingY);
            context.lineTo(xPos, canvas.height - paddingY);
            context.stroke();
          }
      
          // Hàng ngang
          for (let y = 0; y <= rows; y++) {
            context.beginPath();
            const yPos = paddingY + y * cellHeight;
            context.moveTo(paddingX, yPos);
            context.lineTo(canvas.width - paddingX, yPos);
            context.stroke();
          }
        };
      };      
      
  
      const drawPieces = () => {
        const texture = new Image();
        texture.src = '/images/wood-texture.jpg';
      
        texture.onload = () => {
          const paddingX = 80;
          const paddingY = 80;
          const cols = 8;
          const rows = 9;
          const cellWidth = (canvas.width - paddingX * 2) / cols;
          const cellHeight = (canvas.height - paddingY * 2) / rows;
      
          pieces.forEach(p => {
            const centerX = paddingX + p.col * cellWidth;
            const centerY = paddingY + p.row * cellHeight;
      
            const pattern = context.createPattern(texture, 'repeat');
            context.beginPath();
            context.arc(centerX, centerY, 28, 0, 2 * Math.PI);
            context.fillStyle = pattern;
            context.fill();
            context.lineWidth = 3;
            context.strokeStyle = '#000';
            context.stroke();
      
            context.fillStyle = 'white';
            context.font = 'bold 28px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(p.text, centerX, centerY);
          });
        };
      };      
  
    drawBoard();
    drawPieces();
  }, [pieces]);

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
    <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>
      Lượt chơi: {currentTurn === 'red' ? 'Đỏ' : 'Đen'}
    </h2>

    {/* Thông tin người chơi */}
    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
      <div><strong>Bạn là:</strong> {playerName || 'Chưa nhập tên'}</div>
      {roomId && (
        <div style={{ marginTop: '5px' }}>
          <strong>Mã phòng:</strong> <span style={{ color: 'blue' }}>{roomId}</span>
        </div>
      )}
    </div>

    {/* Form nhập tên và mã phòng */}
    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
      <input
        type="text"
        placeholder="Tên người chơi"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        style={{ marginRight: '8px', padding: '6px', width: '150px' }}
      />
      <input
        type="text"
        placeholder="Nhập mã phòng"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        style={{ marginRight: '8px', padding: '6px', width: '150px' }}
      />
      <button
        onClick={() => socket.emit('joinRoom', { roomId, playerName })}
        style={{ padding: '6px 12px', marginRight: '8px' }}
      >
        Tham gia phòng
      </button>
      <button
        onClick={() => {
          const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
          setRoomId(newRoomId);
          socket.emit('joinRoom', { roomId: newRoomId, playerName });
        }}
        style={{ padding: '6px 12px' }}
      >
        Tạo phòng mới
      </button>
    </div>

    {/* Danh sách người chơi */}
    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
      <strong>Người chơi trong phòng:</strong>
      <ul style={{ listStyleType: 'none', padding: 0, marginTop: '5px' }}>
        {players.map((player) => (
          <li key={player.id} style={{ marginBottom: '4px' }}>
            {player.name}
          </li>
        ))}
      </ul>
    </div>

    {/* Bàn cờ */}
    <canvas ref={canvasRef} width={700} height={770} onClick={handleClick} style={{ display: 'block', margin: '0 auto' }} />
  </div>
);
}

export default ChessBoard;
