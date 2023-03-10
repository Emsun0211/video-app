import React, { createContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const SocketContext = createContext();

const socket = io("http://localhost:5000");

const ContextProvider = ({ children }) => {
	const [stream, setStream] = useState(null);
	const [me, setMe] = useState("");
	const [call, setcall] = useState({});
	const [callAcceppted, setCallAcceppted] = useState(false);
	// const [callRejected, setCallRejected] = useState(false);
	// const [callFailed, setCallFailed] = useState(false);
	const [callEnded, setCallEnded] = useState(false);
	const [name, setName] = useState("");

	const myVideo = useRef();
	const userVideo = useRef();
	const connectionRef = useRef();
	useEffect(() => {
		navigator.mediaDevices
			.getUserMedia({ video: true, audio: true })
			.then((currentStream) => {
				setStream(currentStream);
				myVideo.current.srcObject = currentStream;
			});

		socket.on("me", (id) => setMe(id));

		socket.on("calluser", ({ from, name: callerName, signal }) => {
			setcall({ isRecievedCall: true, from, name: callerName, signal });
		});
	}, []);

	const answerCall = () => {
		setCallAcceppted(true);
		const peer = new Peer({ initiator: false, trickle: false, stream });
		peer.on("signal", (data) => {
			socket.emit("answercall", { signal: data, to: call.from });
		});

		peer.on("stream", (currentStream) => {
			userVideo.current.srcObject = currentStream;
		});

		peer.signal(call.signal);
		connectionRef.current = peer;
	};

	const callUser = (id) => {
		const peer = new Peer({ initiator: true, trickle: false, stream });
		console.log("Peering");

		peer.on("signal", (data) => {
			socket.emit("calluser", {
				userToCall: id,
				signalData: data,
				from: me,
				name,
			});
		});
		console.log("Connecting");

		peer.on("stream", (currentStream) => {
			userVideo.current.srcObject = currentStream.streams[0];
		});
		console.log("Connected");
		socket.on("callaccepted", (signal) => {
			setCallAcceppted(true);

			peer.signal(signal);
		});
		console.log("Ongoing call");
		connectionRef.current = peer;
	};

	const leaveCall = () => {
		setCallEnded(true);
		connectionRef.current.destroy();
		window.location.reload();
	};

	return (
		<SocketContext.Provider
			value={{
				call,
				callAcceppted,
				myVideo,
				userVideo,
				stream,
				name,
				setName,
				callEnded,
				me,
				callUser,
				leaveCall,
				answerCall,
			}}>
			{children}
		</SocketContext.Provider>
	);
};

export { ContextProvider, SocketContext };
