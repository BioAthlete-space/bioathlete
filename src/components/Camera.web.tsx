import React from 'react';
import { View } from 'react-native';

export const CameraView = (props: any) => <View {...props} />;
export const useCameraPermissions = () => [{ granted: false }, async () => ({ granted: false })];
