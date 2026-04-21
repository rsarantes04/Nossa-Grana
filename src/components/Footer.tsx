import React from 'react';
import { Box, Typography, Container, useTheme, useMediaQuery } from '@mui/material';
import { Logo } from './Logo';

interface FooterProps {
  versao?: string;
}

export const Footer: React.FC<FooterProps> = ({ 
  versao = "v1.0" 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: '#1B2B3A', 
        color: 'white',
        py: 4,
        px: 2,
        borderTop: '2px solid #D4AF37',
        boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        mt: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: 1 }}>
          <Logo 
            size="medium" 
            layout="vertical" 
            color="white"
            className="mb-2"
          />
        </Box>

        <Typography 
          variant="h6" 
          sx={{ 
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            letterSpacing: '2px',
            color: '#FFFFFF',
            fontSize: '1.2rem',
            mb: 0.5,
            textTransform: 'uppercase'
          }}
        >
          NOSSA GRANA
        </Typography>

        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block',
            fontFamily: 'Inter, sans-serif',
            color: '#D4AF37',
            fontWeight: 600,
            letterSpacing: '1.5px',
            mb: 2,
            opacity: 0.9
          }}
        >
          FINANÇAS EM FAMÍLIA
        </Typography>

        <Box 
          sx={{ 
            pt: 2, 
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              fontFamily: 'Inter, sans-serif',
              opacity: 0.5
            }}
          >
            © {new Date().getFullYear()} • {versao}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
