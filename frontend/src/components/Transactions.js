import React, { useState, useEffect, useMemo } from 'react';
import { salesAPI, API_BASE_URL } from '../services/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Helper to get a stable YYYY-MM-DD string explicitly in Philippines Time (Asia/Manila)
    const getPHDateString = (dateObj) => {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Manila',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const parts = formatter.formatToParts(dateObj);
            const year = parts.find(p => p.type === 'year').value;
            const month = parts.find(p => p.type === 'month').value;
            const day = parts.find(p => p.type === 'day').value;
            return `${year}-${month}-${day}`;
        } catch (e) {
            // Fallback if Intl parsing fails
            return dateObj.toISOString().split('T')[0];
        }
    };

    const [selectedDate, setSelectedDate] = useState(getPHDateString(new Date()));

    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Sorting
    const [sortField, setSortField] = useState('timestamp');
    const [sortDirection, setSortDirection] = useState('desc'); // newest first by default

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

    const getTotalItems = (items) => {
        if (!items || !Array.isArray(items)) return 0;
        return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    };

    // Get all product names from a transaction's items
    const getProductNames = (items) => {
        if (!items || !Array.isArray(items)) return '';
        return items.map(item => item.product_name || `Product #${item.product}`).join(', ').toLowerCase();
    };

    // Filter transactions — now searches Transaction ID AND product names
    const filteredTransactions = useMemo(() => {
        return transactions.filter((t) => {
            const term = searchTerm.toLowerCase();
            const matchesTransactionId = t.transaction_id?.toLowerCase().includes(term);
            const matchesProduct = term ? getProductNames(t.items).includes(term) : true;
            const matchesSearch = matchesTransactionId || matchesProduct;

            let matchesDate = true;
            if (selectedDate) {
                const tDate = new Date(t.timestamp || t.created_at);
                const tDateString = getPHDateString(tDate);

                if (tDateString !== selectedDate) {
                    matchesDate = false;
                }
            }

            return matchesSearch && matchesDate;
        });
    }, [transactions, searchTerm, selectedDate]);

    // Sort filtered transactions
    const sortedTransactions = useMemo(() => {
        const sorted = [...filteredTransactions];
        sorted.sort((a, b) => {
            let valA, valB;

            switch (sortField) {
                case 'timestamp':
                    valA = new Date(a.timestamp || a.created_at).getTime();
                    valB = new Date(b.timestamp || b.created_at).getTime();
                    break;
                case 'transaction_id':
                    valA = (a.transaction_id || '').toLowerCase();
                    valB = (b.transaction_id || '').toLowerCase();
                    break;
                case 'items':
                    valA = getTotalItems(a.items);
                    valB = getTotalItems(b.items);
                    break;
                case 'total_amount':
                    valA = parseFloat(a.total_amount || 0);
                    valB = parseFloat(b.total_amount || 0);
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredTransactions, sortField, sortDirection]);

    // Pagination logic
    const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = sortedTransactions.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to page 1 when filters/sort change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedDate, sortField, sortDirection]);

    // Summary stats
    const stats = useMemo(() => {
        const total = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);
        const count = filteredTransactions.length;
        const totalItems = filteredTransactions.reduce((sum, t) => sum + getTotalItems(t.items), 0);
        return { total, count, totalItems };
    }, [filteredTransactions]);

    // Handle column sort
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection(field === 'timestamp' ? 'desc' : 'asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return 'fas fa-sort';
        return sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Transactions History (Stock Out)', 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        const dateRange = selectedDate
            ? `Date: ${selectedDate}`
            : 'All Time';
        doc.text(dateRange, 14, 30);

        const tableColumn = ["Date", "Transaction ID", "Total Items", "Total Amount"];
        const tableRows = [];

        let grandTotal = 0;

        // Use sortedTransactions (all filtered, not just current page)
        sortedTransactions.forEach(t => {
            const transactionData = [
                formatDate(t.timestamp || t.created_at),
                t.transaction_id,
                getTotalItems(t.items),
                formatCurrency(t.total_amount)
            ];
            tableRows.push(transactionData);
            grandTotal += parseFloat(t.total_amount || 0);
        });

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
                        data.cell.styles.textColor = [72, 187, 120];
                    }
                }
            }
        });

        const fileName = `transactions_history_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    };

    const handleDownloadReceipt = (transactionId) => {
        try {
            window.open(`${API_BASE_URL}/sales/receipt/pdf/${transactionId}/`, '_blank');
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

    // Generate page numbers with ellipsis
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);

            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
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

            {/* Summary Stats */}
            <div className="txn-stats-grid">
                <div className="txn-stat-card">
                    <div className="txn-stat-icon" style={{ background: 'rgba(74, 144, 226, 0.15)', color: '#4a90e2' }}>
                        <i className="fas fa-receipt"></i>
                    </div>
                    <div className="txn-stat-info">
                        <span className="txn-stat-value">{stats.count}</span>
                        <span className="txn-stat-label">Transactions</span>
                    </div>
                </div>
                <div className="txn-stat-card">
                    <div className="txn-stat-icon" style={{ background: 'rgba(72, 187, 120, 0.15)', color: '#48bb78' }}>
                        <i className="fas fa-peso-sign"></i>
                    </div>
                    <div className="txn-stat-info">
                        <span className="txn-stat-value txn-stat-value-revenue">{formatCurrency(stats.total)}</span>
                        <span className="txn-stat-label">Total Revenue</span>
                    </div>
                </div>
                <div className="txn-stat-card">
                    <div className="txn-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                        <i className="fas fa-boxes-stacked"></i>
                    </div>
                    <div className="txn-stat-info">
                        <span className="txn-stat-value">{stats.totalItems}</span>
                        <span className="txn-stat-label">Items Sold</span>
                    </div>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div className="search-bar" style={{ marginBottom: 0, minWidth: '250px' }}>
                            <i className="fas fa-search"></i>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search by ID or product name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="filter-group date-filters" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#adb5bd' }}>Select Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="form-control"
                                style={{ padding: '8px 12px', border: '1px solid #3a3f45', borderRadius: '5px', background: '#2f343a', color: '#f8f9fa' }}
                                title="Select Date"
                            />
                        </div>

                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedDate(getPHDateString(new Date()));
                            }}
                        >
                            <i className="fas fa-undo"></i>
                            Clear Filters
                        </button>
                    </div>

                    <button
                        className="btn btn-success"
                        onClick={handleDownloadPDF}
                        disabled={filteredTransactions.length === 0}
                    >
                        <i className="fas fa-download"></i> Download PDF
                    </button>
                </div>

                {error && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}

                <div className="table-container">
                    {sortedTransactions.length === 0 ? (
                        <p className="empty-state">No transactions found</p>
                    ) : (
                        <>
                            <table>
                                <thead>
                                    <tr>
                                        <th className="sortable-th" onClick={() => handleSort('timestamp')}>
                                            Date & Time <i className={getSortIcon('timestamp')}></i>
                                        </th>
                                        <th className="sortable-th" onClick={() => handleSort('transaction_id')}>
                                            Transaction ID <i className={getSortIcon('transaction_id')}></i>
                                        </th>
                                        <th className="sortable-th" style={{ textAlign: 'center' }} onClick={() => handleSort('items')}>
                                            Total Items <i className={getSortIcon('items')}></i>
                                        </th>
                                        <th className="sortable-th" style={{ textAlign: 'right' }} onClick={() => handleSort('total_amount')}>
                                            Total Amount <i className={getSortIcon('total_amount')}></i>
                                        </th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedTransactions.map((t) => (
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

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="txn-pagination">
                                    <span className="txn-pagination-info">
                                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sortedTransactions.length)} of {sortedTransactions.length}
                                    </span>
                                    <div className="txn-pagination-controls">
                                        <button
                                            className="txn-page-btn"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(1)}
                                            title="First page"
                                        >
                                            <i className="fas fa-angles-left"></i>
                                        </button>
                                        <button
                                            className="txn-page-btn"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                        >
                                            <i className="fas fa-chevron-left"></i>
                                        </button>
                                        {getPageNumbers().map((page, idx) => (
                                            page === '...' ? (
                                                <span key={`ellipsis-${idx}`} className="txn-page-ellipsis">…</span>
                                            ) : (
                                                <button
                                                    key={page}
                                                    className={`txn-page-btn ${currentPage === page ? 'active' : ''}`}
                                                    onClick={() => setCurrentPage(page)}
                                                >
                                                    {page}
                                                </button>
                                            )
                                        ))}
                                        <button
                                            className="txn-page-btn"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                        >
                                            <i className="fas fa-chevron-right"></i>
                                        </button>
                                        <button
                                            className="txn-page-btn"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(totalPages)}
                                            title="Last page"
                                        >
                                            <i className="fas fa-angles-right"></i>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
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
