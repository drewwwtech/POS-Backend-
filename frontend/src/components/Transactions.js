import React, { useState, useEffect } from 'react';
import { salesAPI } from '../services/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { API_BASE_URL } from '../services/api'; // Or we can construct receipt URL

function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const res = await salesAPI.getAll();
            setTransactions(res.data || []);
            setError(null);
        } catch (err) {
            setError('Failed to load transactions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (e) {
            return 'N/A';
        }
    };

    // Filter transactions
    const filteredTransactions = transactions.filter((t) => {
        const matchesSearch = t.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesDate = true;
        if (startDate || endDate) {
            const tDate = new Date(t.timestamp || t.created_at);
            tDate.setHours(0, 0, 0, 0); // Normalize time

            if (startDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                if (tDate < sDate) matchesDate = false;
            }

            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                if (tDate > eDate) matchesDate = false;
            }
        }

        return matchesSearch && matchesDate;
    });

    const getTotalItems = (items) => {
        if (!items || !Array.isArray(items)) return 0;
        return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Transactions History (Stock Out)', 14, 22);

        // Subtitle
        doc.setFontSize(11);
        doc.setTextColor(100);
        const dateRange = (startDate && endDate)
            ? `Date Range: ${startDate} to ${endDate}`
            : startDate ? `From: ${startDate}`
                : endDate ? `Until: ${endDate}`
                    : 'All Time';
        doc.text(dateRange, 14, 30);

        // Generate Table
        const tableColumn = ["Date", "Transaction ID", "Total Items", "Total Amount"];
        const tableRows = [];

        let grandTotal = 0;

        filteredTransactions.forEach(t => {
            const transactionData = [
                formatDate(t.timestamp || t.created_at),
                t.transaction_id,
                getTotalItems(t.items),
                formatCurrency(t.total_amount)
            ];
            tableRows.push(transactionData);
            grandTotal += parseFloat(t.total_amount || 0);
        });

        // Add total row
        tableRows.push(['', '', 'GRAND TOTAL:', formatCurrency(grandTotal)]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [74, 144, 226] },
            didParseCell: function (data) {
                if (data.row.index === tableRows.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    if (data.column.index === 3) {
                        data.cell.styles.textColor = [72, 187, 120]; // Green color matching success btn
                    }
                }
            }
        });

        const fileName = `transactions_history_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    };

    const handleDownloadReceipt = (transactionId) => {
        try {
            const API_URl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
            window.open(`${API_URl}/sales/receipt/pdf/${transactionId}/`, '_blank');
        } catch (error) {
            console.error("Could not open receipt", error);
        }
    };

    const handleViewTransaction = (transaction) => {
        setSelectedTransaction(transaction);
    };

    const closeTransactionModal = () => {
        setSelectedTransaction(null);
    };

    if (loading) {
        return <div className="loading">Loading transactions...</div>;
    }

    return (
        <div className="page">
            <header className="page-header">
                <h1>Transactions</h1>
                <p>View sales history and stock out records</p>
            </header>

            <div className="card">
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div className="search-bar" style={{ marginBottom: 0, minWidth: '250px' }}>
                            <i className="fas fa-search"></i>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search Transaction ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="form-control"
                                style={{ padding: '8px 12px', border: '1px solid #3a3f45', borderRadius: '5px', background: '#2f343a', color: '#f8f9fa' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="form-control"
                                style={{ padding: '8px 12px', border: '1px solid #3a3f45', borderRadius: '5px', background: '#2f343a', color: '#f8f9fa' }}
                            />
                        </div>

                        <button className="btn btn-secondary" onClick={() => {
                            setSearchTerm('');
                            setStartDate('');
                            setEndDate('');
                        }}>
                            Clear Filters
                        </button>
                    </div>

                    <button
                        className="btn btn-success"
                        onClick={handleDownloadPDF}
                        disabled={filteredTransactions.length === 0}
                    >
                        <i className="fas fa-download"></i> Download Transactions PDF
                    </button>
                </div>

                {error && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}

                <div className="table-container">
                    {filteredTransactions.length === 0 ? (
                        <p className="empty-state">No transactions found</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>Transaction ID</th>
                                    <th style={{ textAlign: 'center' }}>Total Items</th>
                                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                                    <th style={{ textAlign: 'center' }}>Receipt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((t) => (
                                    <tr key={t.id}>
                                        <td>{formatDate(t.timestamp || t.created_at)}</td>
                                        <td><strong>{t.transaction_id}</strong></td>
                                        <td style={{ textAlign: 'center' }}>{getTotalItems(t.items)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(t.total_amount)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className="btn btn-primary"
                                                style={{ padding: '5px 10px', fontSize: '0.85rem' }}
                                                onClick={() => handleViewTransaction(t)}
                                            >
                                                <i className="fas fa-eye"></i> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Transaction Details Modal */}
            {selectedTransaction && (
                <div className="modal-overlay" onClick={closeTransactionModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Transaction Details</h2>
                            <button className="modal-close" onClick={closeTransactionModal}>×</button>
                        </div>

                        <div style={{ marginBottom: '20px', padding: '15px', background: '#252a30', borderRadius: '8px', border: '1px solid #3a3f45' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <span style={{ color: '#adb5bd', fontSize: '0.85rem', display: 'block' }}>Transaction ID</span>
                                    <strong>{selectedTransaction.transaction_id}</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#adb5bd', fontSize: '0.85rem', display: 'block' }}>Date & Time</span>
                                    <span>{formatDate(selectedTransaction.timestamp || selectedTransaction.created_at)}</span>
                                </div>
                                <div style={{ gridColumn: '1 / -1', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #3a3f45' }}>
                                    <span style={{ color: '#adb5bd', fontSize: '0.85rem', display: 'block' }}>Total Amount</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#48bb78' }}>
                                        {formatCurrency(selectedTransaction.total_amount)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <h3>Items</h3>
                        <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th style={{ textAlign: 'center' }}>Qty</th>
                                        <th style={{ textAlign: 'right' }}>Unit Price</th>
                                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedTransaction.items && selectedTransaction.items.map((item, index) => (
                                        <tr key={index}>
                                            <td><strong>{item.product_name || `Product #${item.product}`}</strong></td>
                                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(parseFloat(item.unit_price) * item.quantity)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                            <button type="button" className="btn btn-secondary" onClick={closeTransactionModal}>
                                Close
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => handleDownloadReceipt(selectedTransaction.transaction_id)}
                            >
                                <i className="fas fa-file-pdf"></i> Download PDF Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Transactions;
