import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, Dimensions, Platform } from 'react-native';
import { Button, Text } from 'react-native-paper';
import Svg, { Path, G } from 'react-native-svg';
import { theme } from '../../constants/theme';

interface SignaturePadProps {
  onSignatureSubmit: (signature: string) => void;
  onCancel: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSignatureSubmit, onCancel }) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const svgRef = useRef<Svg>(null);
  const { width } = Dimensions.get('window');
  const padWidth = Math.min(width - 64, 500);
  const padHeight = 200;

  // Create PanResponder for signature drawing
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(`M ${locationX},${locationY}`);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(prev => `${prev} L ${locationX},${locationY}`);
    },
    onPanResponderRelease: () => {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath('');
    },
  });

  // Clear the signature
  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  // Submit the signature
  const handleSubmit = async () => {
    if (paths.length === 0) {
      return;
    }

    if (svgRef.current) {
      try {
        // Generate SVG as data URL
        const svgString = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${padWidth}" height="${padHeight}" viewBox="0 0 ${padWidth} ${padHeight}">
            <g>
              ${paths.map(path => `<path d="${path}" fill="none" stroke="black" stroke-width="2" />`).join('')}
            </g>
          </svg>
        `;
        
        // Convert SVG to base64 data URL
        const base64 = btoa(svgString);
        const dataUrl = `data:image/svg+xml;base64,${base64}`;
        
        onSignatureSubmit(dataUrl);
      } catch (error) {
        console.error('Error converting signature to data URL:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.padContainer}>
        <Svg
          ref={svgRef}
          height={padHeight}
          width={padWidth}
          style={styles.pad}
          {...panResponder.panHandlers}
        >
          <G>
            {/* Render existing paths */}
            {paths.map((path, index) => (
              <Path
                key={index}
                d={path}
                stroke="black"
                strokeWidth={2}
                fill="none"
              />
            ))}
            
            {/* Render current path being drawn */}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke="black"
                strokeWidth={2}
                fill="none"
              />
            ) : null}
          </G>
        </Svg>
        
        {/* Signature line */}
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>Sign above</Text>
      </View>
      
      <View style={styles.buttonsContainer}>
        <Button mode="outlined" onPress={handleClear} style={styles.button}>
          Clear
        </Button>
        <Button 
          mode="contained" 
          onPress={handleSubmit} 
          style={styles.button}
          disabled={paths.length === 0}
        >
          Submit
        </Button>
        <Button mode="text" onPress={onCancel} style={styles.button}>
          Cancel
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  padContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  pad: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
  },
  signatureLine: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: '#CCCCCC',
  },
  signatureLabel: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#999999',
    fontSize: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default SignaturePad;
