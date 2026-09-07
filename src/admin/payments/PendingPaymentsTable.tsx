'use client';

import { useState } from 'react';
import { Eye, Clock, Filter } from 'lucide-react';
import { Badge } from '@niaga/lib-ui/primitives/badge';
import { Button } from '@niaga/lib-ui/primitives/button';
import PaymentVerifyModal from './PaymentVerifyModal';

export interface PendingPayment {
    /**
     * The RECEIPT's own id, not the order's.
     *
     * service-order's verify/reject endpoints are PUT /admin/payments/:id/{verify,reject}
     * and parse `:id` as the payment-receipt uuid, looking it up with GetReceiptByID. The
     * table used to hand `orderId` to those callbacks; both are uuids, so it parsed and
     * then found nothing. NIAGA-245.
     */
    id: string;
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    amount: number;
    paymentMethod: string;
    depositorName: string;
    depositDate: string;
    referenceNumber: string;
    bankName: string;
    receiptUrl: string;
    uploadedAt: string;
}

interface PendingPaymentsTableProps {
    payments: PendingPayment[];
    /** Receives the RECEIPT id (`PendingPayment.id`), not the order id — see above. */
    onVerify: (receiptId: string, note: string) => Promise<void>;
    /** Receives the RECEIPT id (`PendingPayment.id`), not the order id — see above. */
    onReject: (receiptId: string, reason: string) => Promise<void>;
    onRefresh: () => void;
}

export default function PendingPaymentsTable({ payments, onVerify, onReject, onRefresh }: PendingPaymentsTableProps) {
    const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMethod, setFilterMethod] = useState<string>('all');

    const formatMYR = (amount: number) => {
        return new Intl.NumberFormat('ms-MY', {
            style: 'currency',
            currency: 'MYR',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) {
            return 'Just now';
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        }

        return date.toLocaleDateString('en-MY', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const getUrgencyBadge = (uploadedAt: string) => {
        const hours = Math.floor((new Date().getTime() - new Date(uploadedAt).getTime()) / (1000 * 60 * 60));

        if (hours > 20) {
            return <Badge className="bg-red-500">Urgent</Badge>;
        } else if (hours > 12) {
            return <Badge className="bg-orange-500">Priority</Badge>;
        }
        return <Badge className="bg-blue-500">New</Badge>;
    };

    const filteredPayments = payments.filter(payment => {
        const matchesSearch =
            payment.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            payment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            payment.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            payment.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter =
            filterMethod === 'all' ||
            payment.paymentMethod === filterMethod;

        return matchesSearch && matchesFilter;
    });

    const handleVerify = async (note: string) => {
        if (selectedPayment) {
            await onVerify(selectedPayment.id, note);
            setSelectedPayment(null);
            onRefresh();
        }
    };

    const handleReject = async (reason: string) => {
        if (selectedPayment) {
            await onReject(selectedPayment.id, reason);
            setSelectedPayment(null);
            onRefresh();
        }
    };

    return (
        <>
            <div className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by order, customer, or reference number..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-500" />
                        <select
                            value={filterMethod}
                            onChange={(e) => setFilterMethod(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="all">All Methods</option>
                            <option value="cash_deposit">Cash Deposit</option>
                            <option value="bank_transfer">Bank Transfer</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Order
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Method
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Receipt Info
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Uploaded
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-lg font-semibold">No pending payments</p>
                                            <p className="text-sm">
                                                {searchQuery || filterMethod !== 'all'
                                                    ? 'Try adjusting your search or filters'
                                                    : 'All payments have been verified'}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {getUrgencyBadge(payment.uploadedAt)}
                                                    <span className="font-mono text-sm font-medium">
                                                        {payment.orderNumber}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{payment.customerName}</p>
                                                    <p className="text-sm text-gray-500">{payment.customerEmail}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-bold text-gray-900">
                                                    {formatMYR(payment.amount)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant="outline">
                                                    {payment.paymentMethod === 'cash_deposit' ? 'CDM' : 'Transfer'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">
                                                    <p className="text-gray-900 font-medium">{payment.depositorName}</p>
                                                    <p className="text-gray-500">{payment.bankName}</p>
                                                    <p className="text-gray-500 font-mono text-xs">{payment.referenceNumber}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {formatDate(payment.uploadedAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => setSelectedPayment(payment)}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Verify
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary */}
                <div className="text-sm text-gray-600">
                    Showing {filteredPayments.length} of {payments.length} pending payments
                </div>
            </div>

            {/* Verify Modal */}
            {selectedPayment && (
                <PaymentVerifyModal
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                    onApprove={handleVerify}
                    onReject={handleReject}
                />
            )}
        </>
    );
}
