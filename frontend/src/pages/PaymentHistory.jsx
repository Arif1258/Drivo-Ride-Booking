import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
    Wallet, 
    CreditCard, 
    Plus, 
    ArrowUpRight, 
    Printer, 
    CheckCircle2, 
    ShieldCheck, 
    Sparkles, 
    Smartphone, 
    Banknote, 
    History 
} from 'lucide-react';
import { notyf } from '../utils/notyf';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const SAMPLE_PAYMENTS = [
    {
        _id: 'pay-001',
        paymentId: 'PAY-DRV-98124',
        transactionId: 'TXN-872619024',
        amount: 285,
        paymentMethod: 'upi',
        paymentStatus: 'successful',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        rideId: { destination: 'Park Street Metro Station, Kolkata' }
    },
    {
        _id: 'pay-002',
        paymentId: 'PAY-DRV-98123',
        transactionId: 'TXN-872619023',
        amount: 190,
        paymentMethod: 'card',
        paymentStatus: 'successful',
        createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        rideId: { destination: 'New Town Eco Park, Kolkata' }
    },
    {
        _id: 'pay-003',
        paymentId: 'PAY-DRV-98122',
        transactionId: 'TXN-872619022',
        amount: 120,
        paymentMethod: 'wallet',
        paymentStatus: 'successful',
        createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
        rideId: { destination: 'Victoria Memorial Hall, Kolkata' }
    }
];

const PaymentHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [walletBalance, setWalletBalance] = useState(650);
    const [topUpModal, setTopUpModal] = useState(false);
    const [addAmount, setAddAmount] = useState('200');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/payments/user-history`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    },
                    timeout: 5000
                });
                if (response.status === 200 && response.data && response.data.length > 0) {
                    setHistory(response.data);
                } else {
                    setHistory(SAMPLE_PAYMENTS);
                }
            } catch (error) {
                console.log('Error fetching payment history, showing demo items:', error.message);
                setHistory(SAMPLE_PAYMENTS);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const handleTopUp = () => {
        const amount = parseInt(addAmount, 10);
        if (isNaN(amount) || amount <= 0) {
            notyf.error('Please enter a valid amount');
            return;
        }
        setWalletBalance(prev => prev + amount);
        notyf.success(`₹${amount} added to Drivo Wallet!`);
        setTopUpModal(false);
    };

    const printInvoice = (payment) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice - ${payment.paymentId}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; text-align: left; color: #0f172a; max-width: 480px; margin: auto; }
                        hr { border: 0; border-top: 1px dashed #cbd5e1; margin: 15px 0; }
                        .flex { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; }
                        .logo { font-size: 24px; font-weight: 900; color: #2563eb; text-align: center; }
                        .total { font-size: 18px; font-weight: 800; color: #0f172a; }
                    </style>
                </head>
                <body>
                    <div class="logo">DRIVO</div>
                    <p style="text-align: center; font-size: 12px; color: #64748b; margin-top: 2px;">PAYMENT RECEIPT</p>
                    <p style="text-align: center; font-size: 11px; color: #94a3b8;">Date: ${new Date(payment.createdAt).toLocaleString()}</p>
                    <hr />
                    <div class="flex"><p>Payment ID:</p><p><strong>${payment.paymentId}</strong></p></div>
                    <div class="flex"><p>Transaction ID:</p><p>${payment.transactionId}</p></div>
                    <div class="flex"><p>Method:</p><p style="text-transform: uppercase;">${payment.paymentMethod}</p></div>
                    <div class="flex"><p>Destination:</p><p>${payment.rideId?.destination || 'City Transit'}</p></div>
                    <hr />
                    <div class="flex total"><h3>TOTAL AMOUNT:</h3><h3>₹${payment.amount}</h3></div>
                    <hr />
                    <p style="text-align: center; font-size: 11px; color: #64748b; margin-top: 30px;">Thank you for riding with Drivo!</p>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <Navbar />
            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
                            <Wallet className="h-4 w-4" />
                            <span>Digital Wallet & Payments</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Payments & Wallet
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1">
                            Manage your Drivo Wallet balance, linked UPI & cards, and view itemized payment receipts.
                        </p>
                    </div>

                    <button
                        onClick={() => setTopUpModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Money to Wallet</span>
                    </button>
                </div>

                {/* Top Section: Wallet Card & Payment Methods */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Drivo Wallet Card */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-blue-900/80 via-indigo-900/60 to-slate-900 border border-blue-500/30 p-6 shadow-2xl flex flex-col justify-between space-y-6">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase font-black tracking-wider text-blue-300">Drivo Cash Wallet</span>
                                <Sparkles className="h-4 w-4 text-blue-400" />
                            </div>
                            <div className="mt-4">
                                <span className="text-[11px] text-slate-400 block">Available Balance</span>
                                <div className="text-3xl sm:text-4xl font-black text-white mt-1">
                                    ₹{walletBalance}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                1-Click Zero OTP Checkout
                            </span>
                            <button
                                onClick={() => setTopUpModal(true)}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Top Up
                            </button>
                        </div>
                    </div>

                    {/* Saved Payment Methods Card */}
                    <div className="lg:col-span-2 p-6 bg-slate-900/60 border border-white/10 rounded-3xl backdrop-blur-xl space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-emerald-400" />
                                <span>Saved Payment Options</span>
                            </h3>
                            <span className="text-[11px] text-slate-400">Default: Drivo Wallet</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <Smartphone className="h-5 w-5 text-indigo-400" />
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Active</span>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-white block">UPI Instant Pay</span>
                                    <span className="text-[11px] text-slate-400 font-mono">rider@okhdfcbank</span>
                                </div>
                            </div>

                            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <CreditCard className="h-5 w-5 text-blue-400" />
                                    <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">Linked</span>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-white block">Visa Debit Card</span>
                                    <span className="text-[11px] text-slate-400 font-mono">•••• 8812</span>
                                </div>
                            </div>

                            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <Banknote className="h-5 w-5 text-amber-400" />
                                    <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">Always</span>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-white block">Cash to Driver</span>
                                    <span className="text-[11px] text-slate-400">Pay after trip ends</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction History Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            <History className="h-4 w-4 text-blue-400" />
                            <span>Transaction History & Receipts</span>
                        </h2>
                        <span className="text-xs text-slate-400">{history.length} Transactions</span>
                    </div>

                    {loading ? (
                        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
                            <div className="h-10 w-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-xs text-slate-400">Loading ledger...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl text-slate-400 text-xs">
                            No past transactions recorded yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((item) => (
                                <div
                                    key={item._id}
                                    className="p-4 sm:p-5 bg-slate-900/60 hover:bg-slate-900 border border-white/10 rounded-2xl transition-all shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                            <Wallet className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs sm:text-sm font-bold text-white">
                                                    {item.rideId?.destination || 'Trip Payment'}
                                                </h4>
                                                <span className="text-[10px] font-mono text-slate-500">
                                                    {item.paymentId}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span className="capitalize font-semibold text-slate-300">{item.paymentMethod}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                                        <span className="text-base sm:text-lg font-black text-white">
                                            ₹{item.amount}
                                        </span>

                                        <button
                                            onClick={() => printInvoice(item)}
                                            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                                        >
                                            <Printer className="h-3.5 w-3.5 text-blue-400" />
                                            <span>Receipt</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
            </main>

            <Footer />

            {/* Top-up Modal */}
            {topUpModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="font-bold text-base text-white">Top Up Drivo Wallet</h3>
                            <button
                                onClick={() => setTopUpModal(false)}
                                className="text-slate-400 hover:text-white text-xs font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Enter Amount (₹)</label>
                                <input
                                    type="number"
                                    value={addAmount}
                                    onChange={(e) => setAddAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-lg font-bold text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex gap-2">
                                {['100', '200', '500', '1000'].map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setAddAmount(val)}
                                        className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-300"
                                    >
                                        +₹{val}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleTopUp}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/20"
                            >
                                Proceed & Add Money
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentHistory;
