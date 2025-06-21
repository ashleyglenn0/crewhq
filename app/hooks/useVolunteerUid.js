import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

export default function useVolunteerUid(name, event) {
  const [uid, setUid] = useState(null);

  const generateSecureUid = async () => {
    const bytes = await Crypto.getRandomBytesAsync(16);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      "4" + hex.slice(13, 16),
      ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
      hex.slice(20, 32),
    ].join("-");
  };

  useEffect(() => {
    const getOrCreateUid = async () => {
      if (!name || !event) return;

      const key = `uid_${name}_${event}`.replace(/[^a-zA-Z0-9._-]/g, "_");

      try {
        let storedUid = await SecureStore.getItemAsync(key);
        console.log(`📦 UID key checked: ${key} →`, storedUid);

        if (!storedUid) {
          const newUid = await generateSecureUid();
          await SecureStore.setItemAsync(key, newUid);
          console.log("✨ New UID generated and saved:", newUid);
          setUid(newUid);
        } else {
          setUid(storedUid);
        }
      } catch (error) {
        console.error("❌ Error with UID storage:", error);
      }
    };

    getOrCreateUid();
  }, [name, event]);

  return uid;
}
