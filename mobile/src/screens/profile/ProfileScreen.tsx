import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, Card, Button, Divider, Avatar, TextInput, Switch, Dialog, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useBiometricAuth } from '../../contexts/BiometricAuthContext';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';

const ProfileScreen = () => {
  const { user, updateUser, signOut } = useAuth();
  const { 
    isBiometricAvailable, 
    isBiometricEnabled, 
    isBiometricEnrolled,
    enableBiometricAuth,
    disableBiometricAuth
  } = useBiometricAuth();
  
  const [isOffline, setIsOffline] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  
  // Form fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [organization, setOrganization] = useState(user?.organization?.name || '');
  
  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSecure, setPasswordSecure] = useState(true);
  
  const queryClient = useQueryClient();
  
  // Track network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);
  
  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setOrganization(user.organization?.name || '');
    }
  }, [user]);
  
  // Update profile mutation
  const updateProfileMutation = useMutation(
    async (updatedData: { name: string; phone: string }) => {
      return api.put('/api/v1/users/profile', updatedData);
    },
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('currentUser');
        if (updateUser) {
          updateUser(response.data.data);
        }
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      },
      onError: (error) => {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      },
    }
  );
  
  // Change password mutation
  const changePasswordMutation = useMutation(
    async (passwordData: { current_password: string; new_password: string }) => {
      return api.post('/api/v1/users/change-password', passwordData);
    },
    {
      onSuccess: () => {
        setShowChangePasswordDialog(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Success', 'Password changed successfully');
      },
      onError: (error: any) => {
        console.error('Error changing password:', error);
        if (error.response && error.response.status === 401) {
          setPasswordError('Current password is incorrect');
        } else {
          setPasswordError('Failed to change password. Please try again.');
        }
      },
    }
  );
  
  // Update avatar mutation
  const updateAvatarMutation = useMutation(
    async (formData: FormData) => {
      return api.post('/api/v1/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('currentUser');
        if (updateUser) {
          updateUser(response.data.data);
        }
        Alert.alert('Success', 'Profile picture updated successfully');
      },
      onError: (error) => {
        console.error('Error updating avatar:', error);
        Alert.alert('Error', 'Failed to update profile picture. Please try again.');
      },
    }
  );
  
  // Handle save profile
  const handleSaveProfile = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    
    updateProfileMutation.mutate({
      name,
      phone,
    });
  };
  
  // Handle change password
  const handleChangePassword = () => {
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };
  
  // Handle pick avatar
  const handlePickAvatar = async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to change your profile picture!');
          return;
        }
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        
        // Create form data
        const formData = new FormData();
        formData.append('avatar', {
          uri: selectedImage.uri,
          type: 'image/jpeg',
          name: 'profile-picture.jpg',
        } as any);
        
        updateAvatarMutation.mutate(formData);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };
  
  // Handle toggle biometric
  const handleToggleBiometric = async (value: boolean) => {
    try {
      if (value) {
        const success = await enableBiometricAuth();
        if (!success) {
          Alert.alert(
            'Biometric Setup Failed',
            'Failed to enable biometric authentication. Please try again.'
          );
        }
      } else {
        await disableBiometricAuth();
      }
    } catch (error) {
      console.error('Error toggling biometric auth:', error);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    setShowLogoutDialog(false);
    signOut();
  };
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <Avatar.Text 
                size={80} 
                label={user?.name ? getInitials(user.name) : 'U'} 
                style={styles.avatarText}
                color="#FFFFFF"
              />
            )}
            <View style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text variant="headlineSmall" style={styles.userName}>
              {user?.name || 'User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.organization?.name && (
              <View style={styles.organizationBadge}>
                <Ionicons name="business" size={12} color="#FFFFFF" />
                <Text style={styles.organizationName}>{user.organization.name}</Text>
              </View>
            )}
          </View>
          
          {!isEditing ? (
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => setIsEditing(true)}
              disabled={isOffline}
            >
              <Ionicons name="pencil" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        {isOffline && (
          <View style={styles.offlineMessage}>
            <Ionicons name="cloud-offline" size={18} color="#F44336" />
            <Text style={styles.offlineText}>
              You are offline. Some profile features are not available.
            </Text>
          </View>
        )}
        
        {/* Profile Form */}
        {isEditing ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Edit Profile
              </Text>
              
              <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="account" />}
              />
              
              <TextInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="phone" />}
                keyboardType="phone-pad"
              />
              
              <TextInput
                label="Organization"
                value={organization}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="domain" />}
                disabled
              />
              
              <View style={styles.formButtons}>
                <Button 
                  mode="outlined" 
                  onPress={() => setIsEditing(false)}
                  style={styles.formButton}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleSaveProfile}
                  style={[styles.formButton, styles.primaryButton]}
                  loading={updateProfileMutation.isLoading}
                  disabled={updateProfileMutation.isLoading}
                >
                  Save
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <>
            {/* Profile Info */}
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Personal Information
                </Text>
                
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="mail" size={20} color="#757575" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user?.email}</Text>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="phone-portrait" size={20} color="#757575" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="business" size={20} color="#757575" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Organization</Text>
                    <Text style={styles.infoValue}>{user?.organization?.name || 'Not provided'}</Text>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="calendar" size={20} color="#757575" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Member Since</Text>
                    <Text style={styles.infoValue}>
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
            
            {/* Security Settings */}
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Security & Preferences
                </Text>
                
                <TouchableOpacity 
                  style={styles.settingItem}
                  onPress={() => !isOffline && setShowChangePasswordDialog(true)}
                  disabled={isOffline}
                >
                  <View style={styles.settingIcon}>
                    <Ionicons name="lock-closed" size={20} color="#757575" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingLabel}>Change Password</Text>
                    <Text style={styles.settingDescription}>Update your account password</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
                </TouchableOpacity>
                
                {isBiometricAvailable && (
                  <View style={styles.settingItem}>
                    <View style={styles.settingIcon}>
                      <Ionicons name="finger-print" size={20} color="#757575" />
                    </View>
                    <View style={styles.settingContent}>
                      <Text style={styles.settingLabel}>Biometric Login</Text>
                      <Text style={styles.settingDescription}>
                        Use {Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'fingerprint'} to sign in
                      </Text>
                    </View>
                    <Switch
                      value={isBiometricEnabled}
                      onValueChange={handleToggleBiometric}
                      disabled={!isBiometricEnrolled || isOffline}
                      color="#DAB44A"
                    />
                  </View>
                )}
                
                <View style={styles.settingItem}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="notifications" size={20} color="#757575" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingLabel}>Push Notifications</Text>
                    <Text style={styles.settingDescription}>
                      Receive updates about your documents
                    </Text>
                  </View>
                  <Switch
                    value={true}
                    onValueChange={() => {}}
                    disabled={isOffline}
                    color="#DAB44A"
                  />
                </View>
              </Card.Content>
            </Card>
            
            {/* Actions */}
            <Card style={styles.card}>
              <Card.Content>
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => setShowLogoutDialog(true)}
                >
                  <Ionicons name="log-out" size={20} color="#F44336" />
                  <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
      
      {/* Change Password Dialog */}
      <Portal>
        <Dialog visible={showChangePasswordDialog} onDismiss={() => setShowChangePasswordDialog(false)}>
          <Dialog.Title>Change Password</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              mode="outlined"
              style={styles.dialogInput}
              secureTextEntry={passwordSecure}
              right={
                <TextInput.Icon
                  icon={passwordSecure ? 'eye' : 'eye-off'}
                  onPress={() => setPasswordSecure(!passwordSecure)}
                />
              }
            />
            
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              style={styles.dialogInput}
              secureTextEntry={passwordSecure}
            />
            
            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              style={styles.dialogInput}
              secureTextEntry={passwordSecure}
              error={!!passwordError}
            />
            
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowChangePasswordDialog(false)}>Cancel</Button>
            <Button 
              onPress={handleChangePassword}
              loading={changePasswordMutation.isLoading}
              disabled={changePasswordMutation.isLoading}
            >
              Change
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Title>Log Out</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to log out of your account?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>Cancel</Button>
            <Button onPress={handleLogout} textColor="#F44336">Log Out</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    backgroundColor: '#DAB44A',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#DAB44A',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#757575',
    fontSize: 14,
    marginBottom: 8,
  },
  organizationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DAB44A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  organizationName: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: '#DAB44A',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  offlineText: {
    color: '#D32F2F',
    marginLeft: 8,
    flex: 1,
    fontSize: 12,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  formButton: {
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#DAB44A',
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: '#757575',
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingDescription: {
    color: '#757575',
    fontSize: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  logoutText: {
    color: '#F44336',
    fontWeight: '500',
    marginLeft: 8,
  },
  dialogInput: {
    marginBottom: 12,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
});

export default ProfileScreen;
