package staking

import (
	"context"
	"log"
	"math/big"
	"time"

	"github.com/ava-labs/avalanchego/ids"
	"github.com/ava-labs/avalanchego/utils/units"
	exampleerc20 "github.com/ava-labs/icm-contracts/abi-bindings/go/mocks/ExampleERC20"
	erc20tokenstakingmanager "github.com/ava-labs/icm-contracts/abi-bindings/go/validator-manager/ERC20TokenStakingManager"
	iposvalidatormanager "github.com/ava-labs/icm-contracts/abi-bindings/go/validator-manager/interfaces/IPoSValidatorManager"
	localnetwork "github.com/ava-labs/icm-contracts/tests/network"
	"github.com/ava-labs/icm-contracts/tests/utils"
	"github.com/ava-labs/subnet-evm/accounts/abi/bind"
	. "github.com/onsi/gomega"
)

/*
 * Registers a erc20 token staking validator on a L1. The steps are as follows:
 * - Deploy the ERCTokenStakingManager
 * - Initiate validator registration
 * - Deliver the Warp message to the P-Chain (not implemented)
 * - Aggregate P-Chain signatures on the response Warp message
 * - Deliver the Warp message to the L1
 * - Verify that the validator is registered in the staking contract
 *
 * Delists the validator from the L1. The steps are as follows:
 * - Initiate validator delisting
 * - Deliver the Warp message to the P-Chain (not implemented)
 * - Aggregate P-Chain signatures on the response Warp message
 * - Deliver the Warp message to the L1
 * - Verify that the validator is delisted from the staking contract
 */
func ERC20TokenStakingManager(network *localnetwork.LocalNetwork) {
	// Get the L1s info
	cChainInfo := network.GetPrimaryNetworkInfo()
	l1AInfo, _ := network.GetTwoL1s()
	_, fundedKey := network.GetFundedAccountInfo()
	pChainInfo := utils.GetPChainInfo(cChainInfo)

	signatureAggregator := utils.NewSignatureAggregator(
		cChainInfo.NodeURIs[0],
		[]ids.ID{
			l1AInfo.L1ID,
		},
	)
	ctx := context.Background()

	nodes, initialValidationIDs, _ := network.ConvertSubnet(
		ctx,
		l1AInfo,
		utils.ERC20TokenStakingManager,
		[]uint64{units.Schmeckle, 1000 * units.Schmeckle}, // Choose weights to avoid validator churn limits
		fundedKey,
		false,
	)
	stakingManagerAddress := network.GetValidatorManager(l1AInfo.L1ID)
	erc20StakingManager, err := erc20tokenstakingmanager.NewERC20TokenStakingManager(
		stakingManagerAddress,
		l1AInfo.RPCClient,
	)
	Expect(err).Should(BeNil())
	erc20Address, err := erc20StakingManager.Erc20(&bind.CallOpts{})
	Expect(err).Should(BeNil())
	erc20, err := exampleerc20.NewExampleERC20(erc20Address, l1AInfo.RPCClient)
	Expect(err).Should(BeNil())

	//
	// Delist one initial validator
	//
	posStakingManager, err := iposvalidatormanager.NewIPoSValidatorManager(stakingManagerAddress, l1AInfo.RPCClient)
	Expect(err).Should(BeNil())
	utils.InitializeAndCompleteEndInitialPoSValidation(
		ctx,
		signatureAggregator,
		fundedKey,
		l1AInfo,
		pChainInfo,
		posStakingManager,
		stakingManagerAddress,
		initialValidationIDs[0],
		0,
		nodes[0].Weight,
		network.GetPChainWallet(),
		network.GetNetworkID(),
	)

	//
	// Register the validator as PoS
	//
	expiry := uint64(time.Now().Add(24 * time.Hour).Unix())
	validationID := utils.InitializeAndCompleteERC20ValidatorRegistration(
		ctx,
		signatureAggregator,
		fundedKey,
		l1AInfo,
		pChainInfo,
		erc20StakingManager,
		stakingManagerAddress,
		erc20,
		expiry,
		nodes[0],
		network.GetPChainWallet(),
		network.GetNetworkID(),
	)
	validatorStartTime := time.Now()

	//
	// Register a delegator
	//
	var delegationID ids.ID
	{
		log.Println("Registering delegator")
		delegatorStake, err := erc20StakingManager.WeightToValue(
			&bind.CallOpts{},
			nodes[0].Weight,
		)
		Expect(err).Should(BeNil())
		delegatorStake.Div(delegatorStake, big.NewInt(10))
		delegatorWeight, err := erc20StakingManager.ValueToWeight(
			&bind.CallOpts{},
			delegatorStake,
		)
		Expect(err).Should(BeNil())
		newValidatorWeight := nodes[0].Weight + delegatorWeight

		nonce := uint64(1)

		receipt := utils.InitializeERC20DelegatorRegistration(
			ctx,
			fundedKey,
			l1AInfo,
			validationID,
			delegatorStake,
			erc20,
			stakingManagerAddress,
			erc20StakingManager,
		)
		initRegistrationEvent, err := utils.GetEventFromLogs(
			receipt.Logs,
			erc20StakingManager.ParseDelegatorAdded,
		)
		Expect(err).Should(BeNil())
		delegationID = initRegistrationEvent.DelegationID

		aggregator := network.GetSignatureAggregator()
		defer aggregator.Shutdown()

		// Gather subnet-evm Warp signatures for the L1ValidatorWeightMessage & relay to the P-Chain
		signedWarpMessage := utils.ConstructSignedWarpMessage(
			context.Background(),
			receipt,
			l1AInfo,
			pChainInfo,
			nil,
			aggregator,
		)

		// Issue a tx to update the validator's weight on the P-Chain
		network.GetPChainWallet().IssueSetL1ValidatorWeightTx(signedWarpMessage.Bytes())
		utils.PChainProposerVMWorkaround(network.GetPChainWallet())
		utils.AdvanceProposerVM(ctx, l1AInfo, fundedKey, 5)

		// Construct an L1ValidatorWeightMessage Warp message from the P-Chain
		registrationSignedMessage := utils.ConstructL1ValidatorWeightMessage(
			validationID,
			nonce,
			newValidatorWeight,
			l1AInfo,
			pChainInfo,
			signatureAggregator,
			network.GetNetworkID(),
		)

		// Deliver the Warp message to the L1
		receipt = utils.CompleteDelegatorRegistration(
			ctx,
			fundedKey,
			delegationID,
			l1AInfo,
			stakingManagerAddress,
			registrationSignedMessage,
		)
		// Check that the validator is registered in the staking contract
		registrationEvent, err := utils.GetEventFromLogs(
			receipt.Logs,
			erc20StakingManager.ParseDelegatorRegistered,
		)
		Expect(err).Should(BeNil())
		Expect(registrationEvent.ValidationID[:]).Should(Equal(validationID[:]))
		Expect(registrationEvent.DelegationID[:]).Should(Equal(delegationID[:]))
	}

	//
	// Delist the delegator
	//
	{
		log.Println("Delisting delegator")
		nonce := uint64(2)
		receipt := utils.InitializeEndDelegation(
			ctx,
			fundedKey,
			l1AInfo,
			stakingManagerAddress,
			delegationID,
		)
		delegatorRemovalEvent, err := utils.GetEventFromLogs(
			receipt.Logs,
			erc20StakingManager.ParseDelegatorRemovalInitialized,
		)
		Expect(err).Should(BeNil())
		Expect(delegatorRemovalEvent.ValidationID[:]).Should(Equal(validationID[:]))
		Expect(delegatorRemovalEvent.DelegationID[:]).Should(Equal(delegationID[:]))

		aggregator := network.GetSignatureAggregator()
		defer aggregator.Shutdown()

		// Gather subnet-evm Warp signatures for the SetL1ValidatorWeightMessage & relay to the P-Chain
		// (Sending to the P-Chain will be skipped for now)
		signedWarpMessage := utils.ConstructSignedWarpMessage(
			context.Background(),
			receipt,
			l1AInfo,
			pChainInfo,
			nil,
			aggregator,
		)
		Expect(err).Should(BeNil())

		// Issue a tx to update the validator's weight on the P-Chain
		network.GetPChainWallet().IssueSetL1ValidatorWeightTx(signedWarpMessage.Bytes())
		utils.PChainProposerVMWorkaround(network.GetPChainWallet())
		utils.AdvanceProposerVM(ctx, l1AInfo, fundedKey, 5)

		// Construct an L1ValidatorWeightMessage Warp message from the P-Chain
		signedMessage := utils.ConstructL1ValidatorWeightMessage(
			validationID,
			nonce,
			nodes[0].Weight,
			l1AInfo,
			pChainInfo,
			signatureAggregator,
			network.GetNetworkID(),
		)

		// Deliver the Warp message to the L1
		receipt = utils.CompleteEndDelegation(
			ctx,
			fundedKey,
			delegationID,
			l1AInfo,
			stakingManagerAddress,
			signedMessage,
		)

		// Check that the delegator has been delisted from the staking contract
		registrationEvent, err := utils.GetEventFromLogs(
			receipt.Logs,
			erc20StakingManager.ParseDelegationEnded,
		)
		Expect(err).Should(BeNil())
		Expect(registrationEvent.ValidationID[:]).Should(Equal(validationID[:]))
		Expect(registrationEvent.DelegationID[:]).Should(Equal(delegationID[:]))
	}

	//
	// Delist the validator
	//
	utils.InitializeAndCompleteEndPoSValidation(
		ctx,
		signatureAggregator,
		fundedKey,
		l1AInfo,
		pChainInfo,
		posStakingManager,
		stakingManagerAddress,
		validationID,
		expiry,
		nodes[0],
		1,
		true,
		validatorStartTime,
		network.GetPChainWallet(),
		network.GetNetworkID(),
	)
}
