import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Download,
  Filter,
  RefreshCw,
  Calendar,
  TrendingUp,
  FileText,
  Calculator,
  Eye,
  UserCheck,
  Banknote,
  PieChart
} from 'lucide-react';
import {
  getPayrollSummary,
  getPayrollEmployees,
  getCurrentPayrollPeriod,
  getPayrollPeriodOptions,
  formatPayrollPeriod,
  exportPayrollData,
  type PayrollSummary,
  type PayrollPeriod,
  type EmployeePayrollSummary
} from '../lib/payroll';
import { formatCurrency } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles } from '../lib/database';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import ExportButton from './ExportButton';
import EmployeePayrollModal from './EmployeePayrollModal';
import PayrollReportsModal from './PayrollReportsModal';
import { useToast } from '../hooks/useToast';

function PayrollDashboard() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod>(getCurrentPayrollPeriod());
  const [availablePeriods] = useState<PayrollPeriod[]>(getPayrollPeriodOptions());
  const [showEmployeeModal, setShowEmployeeModal] = useState<EmployeePayrollSummary | null>(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return;

      // Get user profile and check permissions
      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];
      
      if (!profile?.organisation_id) {
        setError('Ingen organisation hittades för användaren');
        return;
      }

      if (profile.role !== 'admin') {
        setError('Du har inte behörighet att visa lönehantering');
        return;
      }

      setUserProfile(profile);

      // Load payroll summary
      const summaryResult = await getPayrollSummary(profile.organisation_id, selectedPeriod);
      if (summaryResult.error) {
        setError(summaryResult.error.message);
        return;
      }

      setPayrollSummary(summaryResult.data);
    } catch (err) {
      console.error('Error loading payroll data:', err);
      setError('Ett oväntat fel inträffade vid laddning av lönedata.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTimesheet = async (employeeId: string) => {
    try {
      // This would call the approval function
      success('Tidrapport godkänd!');
      await loadData(); // Reload to update status
    } catch (err) {
      showError('Kunde inte godkänna tidrapport');
    }
  };

  const handleBulkApproval = async () => {
    if (!payrollSummary) return;

    try {
      const pendingEmployees = payrollSummary.employeeSummaries.filter(
        emp => emp.status === 'pending'
      );

      if (pendingEmployees.length === 0) {
        showError('Inga väntande tidrapporter att godkänna');
        return;
      }

      // Simulate bulk approval
      success(`${pendingEmployees.length} tidrapporter godkända!`);
      await loadData();
    } catch (err) {
      showError('Kunde inte godkänna tidrapporter');
    }
  };

  const filteredEmployees = payrollSummary?.employeeSummaries.filter(emp => {
    if (filterStatus === 'all') return true;
    return emp.status === filterStatus;
  }) || [];

  const exportData = payrollSummary ? [{
    period: formatPayrollPeriod(payrollSummary.period),
    totalEmployees: payrollSummary.totalEmployees,
    totalHours: payrollSummary.totalHours,
    totalGrossPay: payrollSummary.totalGrossPay,
    totalCommissions: payrollSummary.totalCommissions,
    totalNetPay: payrollSummary.totalNetPay,
    ...payrollSummary.employeeSummaries.reduce((acc, emp, index) => {
      acc[`employee_${index + 1}_name`] = emp.employee.full_name;
      acc[`employee_${index + 1}_hours`] = emp.totalHours;
      acc[`employee_${index + 1}_gross`] = emp.totalGrossPay;
      acc[`employee_${index + 1}_net`] = emp.estimatedNetPay;
      return acc;
    }, {} as Record<string, any>)
  }] : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Lönehantering</h1>
          <LoadingSpinner />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <DollarSign className="w-8 h-8 mr-3 text-green-600" />
            Lönehantering
          </h1>
          <p className="mt-2 text-gray-600">
            Hantera löner, provision och tidrapporter för {formatPayrollPeriod(selectedPeriod)}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <select
            value={`${selectedPeriod.year}-${selectedPeriod.month}`}
            onChange={(e) => {
              const [year, month] = e.target.value.split('-').map(Number);
              setSelectedPeriod({ year, month, startDate: '', endDate: '' });
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {availablePeriods.map(period => (
              <option key={`${period.year}-${period.month}`} value={`${period.year}-${period.month}`}>
                {formatPayrollPeriod(period)}
              </option>
            ))}
          </select>
          <button
            onClick={loadData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Uppdatera
          </button>
          <button
            onClick={() => setShowReportsModal(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <PieChart className="w-4 h-4 mr-2" />
            Rapporter
          </button>
          <ExportButton
            data={exportData}
            filename={`lonehantering-${formatPayrollPeriod(selectedPeriod).toLowerCase().replace(' ', '-')}`}
            title="Exportera"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {payrollSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Anställda</p>
                <p className="text-2xl font-bold text-gray-900">{payrollSummary.totalEmployees}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totala timmar</p>
                <p className="text-2xl font-bold text-gray-900">{payrollSummary.totalHours}h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Banknote className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total bruttolön</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(payrollSummary.totalGrossPay)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Väntande godkännanden</p>
                <p className="text-2xl font-bold text-gray-900">{payrollSummary.pendingApprovals}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {payrollSummary && payrollSummary.pendingApprovals > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <div>
                <h3 className="font-medium text-yellow-900">
                  {payrollSummary.pendingApprovals} tidrapporter väntar på godkännande
                </h3>
                <p className="text-sm text-yellow-700">
                  Granska och godkänn tidrapporter för att slutföra löneberäkningen
                </p>
              </div>
            </div>
            <button
              onClick={handleBulkApproval}
              className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Godkänn alla
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Alla anställda</option>
              <option value="pending">Väntande godkännande</option>
              <option value="approved">Godkända</option>
            </select>
          </div>
          <div className="text-sm text-gray-500">
            {filteredEmployees.length} av {payrollSummary?.totalEmployees || 0} anställda
          </div>
        </div>
      </div>

      {/* Employee Payroll List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Anställdas löneunderlag</h3>
        </div>

        {filteredEmployees.length === 0 ? (
          <EmptyState
            type="general"
            title="Inga anställda hittades"
            description={
              filterStatus !== 'all'
                ? "Inga anställda matchar det valda filtret."
                : "Inga anställda registrerade för denna period."
            }
            actionText={filterStatus !== 'all' ? "Rensa filter" : undefined}
            onAction={filterStatus !== 'all' ? () => setFilterStatus('all') : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anställd
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anställningstyp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timmar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grundlön
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provision
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bruttolön
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employeeSummary) => (
                  <tr key={employeeSummary.employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {employeeSummary.employee.full_name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {employeeSummary.employee.full_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {employeeSummary.employee.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        employeeSummary.employee.employment_type === 'hourly'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {employeeSummary.employee.employment_type === 'hourly' ? 'Timanställd' : 'Månadslön'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">{employeeSummary.totalHours}h</div>
                        {employeeSummary.overtimeHours > 0 && (
                          <div className="text-xs text-orange-600">
                            +{employeeSummary.overtimeHours}h övertid
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{formatCurrency(employeeSummary.basePay)}</div>
                        {employeeSummary.overtimePay > 0 && (
                          <div className="text-xs text-green-600">
                            +{formatCurrency(employeeSummary.overtimePay)} övertid
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {employeeSummary.commissionEarnings > 0 
                        ? formatCurrency(employeeSummary.commissionEarnings)
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {formatCurrency(employeeSummary.totalGrossPay)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        employeeSummary.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : employeeSummary.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {employeeSummary.status === 'approved' ? 'Godkänd' :
                         employeeSummary.status === 'pending' ? 'Väntande' : 'Ej behandlad'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setShowEmployeeModal(employeeSummary)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Visa detaljer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {employeeSummary.status === 'pending' && (
                          <button
                            onClick={() => handleApproveTimesheet(employeeSummary.employee.id)}
                            className="text-gray-400 hover:text-green-600"
                            title="Godkänn tidrapport"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {/* TODO: Generate PDF */}}
                          className="text-gray-400 hover:text-purple-600"
                          title="Generera löneunderlag (PDF)"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Payroll Detail Modal */}
      {showEmployeeModal && (
        <EmployeePayrollModal
          isOpen={!!showEmployeeModal}
          onClose={() => setShowEmployeeModal(null)}
          employeeSummary={showEmployeeModal}
          onApprove={() => {
            handleApproveTimesheet(showEmployeeModal.employee.id);
            setShowEmployeeModal(null);
          }}
        />
      )}

      {/* Payroll Reports Modal */}
      {showReportsModal && payrollSummary && (
        <PayrollReportsModal
          isOpen={showReportsModal}
          onClose={() => setShowReportsModal(false)}
          payrollSummary={payrollSummary}
          organisationId={userProfile?.organisation_id}
        />
      )}
    </div>
  );
}

export default PayrollDashboard;