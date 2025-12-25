import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { Audio } from "expo-av";

type Props = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: Props) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let sound: Audio.Sound | null = null;

    const run = async () => {
      // 🎵 Load + play sound
      sound = new Audio.Sound();
      await sound.loadAsync(
        require("../../assets/audio/splash_jingle.mp3")
      );
      await sound.playAsync();

      // 🎬 Animation logo
      Animated.sequence([
        Animated.delay(50),

        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1.05,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),

        Animated.timing(scale, {
          toValue: 0.97,
          duration: 150,
          useNativeDriver: true,
        }),

        Animated.timing(scale, {
          toValue: 1.0,
          duration: 250,
          useNativeDriver: true,
        }),

        Animated.delay(350),
      ]).start(() => {
        onFinish();
      });
    };

    run();

    return () => {
      sound?.unloadAsync();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../../assets/logo.png")}
        style={[
          styles.logo,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0f",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 220,
    height: 220,
  },
});
