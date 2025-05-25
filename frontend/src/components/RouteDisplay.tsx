import React from 'react';
import { SUPPORTED_CHAINS } from '../constants/chains';

// Simple icon component to replace lucide-react
function ArrowRight({ className }: { className?: string }) {
  return <div className={`${className} flex items-center justify-center`}>→</div>;
}

interface RouteDisplayProps {
  fromChain: string;
  toChain: string;
  amount: string;
}

export default function RouteDisplay({ fromChain, toChain, amount }: RouteDisplayProps) {
  const fromChainConfig = SUPPORTED_CHAINS[fromChain];
  const toChainConfig = SUPPORTED_CHAINS[toChain];

  if (!fromChainConfig || !toChainConfig || !amount) {
    return null;
  }

  const isFromAvalanche = fromChainConfig.isAvalancheL1;
  const isToAvalanche = toChainConfig.isAvalancheL1;

  // Determine route type and steps
  const getRouteSteps = () => {
    if (isFromAvalanche && isToAvalanche) {
      // Avalanche L1 to Avalanche L1 - Direct Teleporter
      return [
        { name: fromChainConfig.shortName, type: 'source' },
        { name: 'Teleporter', type: 'bridge' },
        { name: toChainConfig.shortName, type: 'destination' },
      ];
    } else if (isFromAvalanche && !isToAvalanche) {
      // Avalanche L1 to External - Hybrid Route
      return [
        { name: fromChainConfig.shortName, type: 'source' },
        { name: 'Teleporter', type: 'bridge' },
        { name: 'C-Chain', type: 'intermediate' },
        { name: 'CCIP', type: 'bridge' },
        { name: toChainConfig.shortName, type: 'destination' },
      ];
    } else if (!isFromAvalanche && isToAvalanche) {
      // External to Avalanche L1 - CCIP + Teleporter
      return [
        { name: fromChainConfig.shortName, type: 'source' },
        { name: 'CCIP', type: 'bridge' },
        { name: 'C-Chain', type: 'intermediate' },
        { name: 'Teleporter', type: 'bridge' },
        { name: toChainConfig.shortName, type: 'destination' },
      ];
    } else {
      // External to External - Direct CCIP
      return [
        { name: fromChainConfig.shortName, type: 'source' },
        { name: 'CCIP', type: 'bridge' },
        { name: toChainConfig.shortName, type: 'destination' },
      ];
    }
  };

  const steps = getRouteSteps();

  const getStepColor = (type: string) => {
    switch (type) {
      case 'source':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'destination':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'bridge':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'intermediate':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-2 border border-blue-200">
      <h4 className="text-xs font-semibold text-blue-800 mb-1">Route Preview</h4>
      
      <div className="flex items-center justify-between space-x-1 overflow-x-auto">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className={`px-1.5 py-0.5 rounded border text-xs font-medium whitespace-nowrap ${getStepColor(step.type)}`}>
              {step.name}
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="w-2 h-2 text-blue-600 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="mt-1 flex justify-between text-xs text-blue-700">
        <span>
          {steps.length > 3 ? '5-10 min' : '2-5 min'} • {steps.filter(s => s.type === 'bridge').length} hop{steps.filter(s => s.type === 'bridge').length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
} 