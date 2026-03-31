import DashboardLayout from '../components/layout/DashboardLayout';

const Home = () => {
    return (
        <DashboardLayout>
            <div className="flex h-full min-h-[60vh] items-center justify-center">
                <h1 className="text-4xl md:text-6xl font-black text-white/5 tracking-tighter uppercase">Home</h1>
            </div>
        </DashboardLayout>
    );
};

export default Home;
