import React from 'react';
import { View, Image, ScrollView, StyleSheet } from 'react-native';

const logos = {
  RenderATL: require('../assets/images/PinkPeachIcon.png'),
  ATW: require('../assets/images/ATWLogo.jpg'),
};

const backgrounds = {
  RenderATL: '#fdf0e2',
  ATW: '#f5f5f5',
};

export default function ScreenWrapper({ children, event = 'RenderATL', scroll = true }) {
  const backgroundColor = backgrounds[event] || '#fff';
  const logoSource = logos[event];

  const WrapperComponent = scroll ? ScrollView : View;

  const wrapperStyle = scroll
    ? { backgroundColor }
    : {
        flex: 1,
        backgroundColor,
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 100,
      };

  return (
    <WrapperComponent
      style={wrapperStyle}
      contentContainerStyle={scroll ? [styles.wrapper, { backgroundColor }] : undefined}
    >
      {logoSource && <Image source={logoSource} style={styles.logo} />}
      {children}
    </WrapperComponent>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
    flexGrow: 1,
  },
  logo: {
    width: 160,
    height: 80,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 20,
  },
});
