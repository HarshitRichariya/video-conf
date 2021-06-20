turnConfig = {
    iceServers: [
        {
            urls: ["stun:bn-turn1.xirsys.com"]
        },
        {
            username: "YUVAMDgtkX25BHXQWBzkKgjEiYqUkm0Qdls94kffnehfLOspq5mWMsj5wIS-hSY5AAAAAGDO4VRIYXJzaGl0cmljaA==",
            credential: "7d280294-d191-11eb-af40-0242ac140004",
            urls: [
                "turn:bn-turn1.xirsys.com:80?transport=udp",
                "turn:bn-turn1.xirsys.com:3478?transport=udp",
                "turn:bn-turn1.xirsys.com:80?transport=tcp",
                "turn:bn-turn1.xirsys.com:3478?transport=tcp",
                "turns:bn-turn1.xirsys.com:443?transport=tcp",
                "turns:bn-turn1.xirsys.com:5349?transport=tcp"]
        }]
}