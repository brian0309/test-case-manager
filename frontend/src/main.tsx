import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { useThemeStore } from "./store/themeStore";

useThemeStore.getState().initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<BrowserRouter
			future={{
				v7_startTransition: true,
				v7_relativeSplatPath: true,
			}}
		>
			<App />
		</BrowserRouter>
	</React.StrictMode>
);
