import React from 'react';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface Approver {
  id: number;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

interface ApprovalStage {
  stage_order: number;
  approvers: Approver[];
}

interface ApprovalPipelineProps {
  stages: ApprovalStage[];
  onApprove: (stageIndex: number, approverIndex: number) => void;
  onReject: (stageIndex: number, approverIndex: number, reason: string) => void;
}

const ApprovalPipeline = ({ stages, onApprove, onReject }: ApprovalPipelineProps) => {
  const [activeRejection, setActiveRejection] = React.useState<{stage: number, approver: number} | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected': return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default: return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-4">Approval Pipeline</h3>
      <div className="space-y-4">
        {stages.map((stage, stageIndex) => (
          <div key={stageIndex} className="border rounded-md p-3">
            <div className="font-medium mb-2">Stage {stage.stage_order}</div>
            <div className="space-y-2">
              {stage.approvers.map((approver, approverIndex) => (
                <div key={approver.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center">
                    {getStatusIcon(approver.status)}
                    <span className="ml-2">{approver.name}</span>
                  </div>
                  <div className="flex space-x-2">
                    {approver.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onApprove(stageIndex, approverIndex)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setActiveRejection({stage: stageIndex, approver: approverIndex})}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {approver.status === 'rejected' && (
                      <span className="text-sm text-red-600">Rejected: {approver.rejectionReason}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {activeRejection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Rejection Reason</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full border rounded p-2"
              placeholder="Why is this request being rejected?"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setActiveRejection(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onReject(activeRejection.stage, activeRejection.approver, rejectionReason);
                  setActiveRejection(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalPipeline;