import { useState } from 'react';
import { Box, TextField, Button, List, ListItem, ListItemAvatar, Avatar, ListItemText, Typography, Paper } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { Message } from '../../../mockData/mockDocument';

interface MessagesPanelProps {
  document: {
    messages: Message[];
  };
}

const MessagesPanel = ({ document }: MessagesPanelProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(document.messages);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      userId: 'current-user',
      userName: 'You',
      text: message,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, newMessage]);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        Messages
      </Typography>
      
      <Box sx={{ height: 'calc(100vh - 300px)', overflowY: 'auto', mb: 2 }}>
        <List>
          {messages.map((msg) => (
            <ListItem key={msg.id} alignItems="flex-start" disableGutters>
              <ListItemAvatar>
                <Avatar>{msg.userName.charAt(0)}</Avatar>
              </ListItemAvatar>
              <Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: msg.userId === 'current-user' ? 'primary.light' : 'grey.100',
                    color: msg.userId === 'current-user' ? 'primary.contrastText' : 'text.primary',
                    borderRadius: 2,
                    maxWidth: '70%',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="medium">
                    {msg.userName}
                  </Typography>
                  <Typography variant="body2">{msg.text}</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.7 }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Paper>
              </Box>
            </ListItem>
          ))}
          {messages.length === 0 && (
            <Box textAlign="center" py={4} color="text.secondary">
              <Typography>No messages yet. Start the conversation!</Typography>
            </Box>
          )}
        </List>
      </Box>

      <Box display="flex" gap={1} sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          multiline
          maxRows={4}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSendMessage}
          disabled={!message.trim()}
          sx={{ minWidth: 'auto', height: '40px', alignSelf: 'flex-end' }}
        >
          <SendIcon />
        </Button>
      </Box>
    </Box>
  );
};

export default MessagesPanel;
