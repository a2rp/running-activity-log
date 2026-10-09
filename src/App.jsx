import { useEffect, useState } from "react";
import styles from "./App.module.css";
import SiteHeader from "./components/siteHeader";
import SiteFooter from "./components/siteFooter";
import BackToTop from "./components/backToTop";
import RunningActivityLog from "./components/runningActivityLog";

const repository = "https://github.com/a2rp/running-activity-log";
const App = () => {
    const [showBackToTop, setShowBackToTop] = useState(false);
    useEffect(() => {
        const onScroll = () => setShowBackToTop(window.scrollY > 50);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    return <div className={styles["app-shell"]} id="top">
        <SiteHeader title="Stridebook" mark="S" navItems={[["Overview", "#overview"], ["Run log", "#run-log"], ["Weekly goal", "#weekly-goal"]]} repoUrl={repository} />
        <main className={styles.pageContent}><RunningActivityLog /></main>
        <SiteFooter repoUrl={repository} />
        <BackToTop visible={showBackToTop} />
    </div>;
};
export default App;
