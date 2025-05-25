package ictt_test

import (
	"context"
	"os"
	"testing"
	"time"

	icttFlows "github.com/ava-labs/icm-contracts/tests/flows/ictt"
	localnetwork "github.com/ava-labs/icm-contracts/tests/network"
	"github.com/ava-labs/icm-contracts/tests/utils"
	deploymentUtils "github.com/ava-labs/icm-contracts/utils/deployment-utils"
	"github.com/ethereum/go-ethereum/log"
	"github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

const (
	teleporterByteCodeFile  = "./out/TeleporterMessenger.sol/TeleporterMessenger.json"
	warpGenesisTemplateFile = "./tests/utils/warp-genesis-template.json"

	icttLabel              = "ICTT"
	erc20TokenHomeLabel    = "ERC20TokenHome"
	erc20TokenRemoteLabel  = "ERC20TokenRemote"
	nativeTokenHomeLabel   = "NativeTokenHome"
	nativeTokenRemoteLabel = "NativeTokenRemote"
	multiHopLabel          = "MultiHop"
	sendAndCallLabel       = "SendAndCall"
	registrationLabel      = "Registration"
	upgradabilityLabel     = "upgradability"
)

var (
	LocalNetworkInstance *localnetwork.LocalNetwork
	TeleporterInfo       utils.TeleporterTestInfo
)

func TestValidatorManager(t *testing.T) {
	if os.Getenv("RUN_E2E") == "" {
		t.Skip("Environment variable RUN_E2E not set; skipping E2E tests")
	}

	RegisterFailHandler(ginkgo.Fail)
	ginkgo.RunSpecs(t, "Teleporter e2e test")
}

// Define the Teleporter before and after suite functions.
var _ = ginkgo.BeforeSuite(func() {
	// Generate the Teleporter deployment values
	teleporterDeployerTransaction,
		teleporterDeployedBytecode,
		teleporterDeployerAddress,
		teleporterContractAddress,
		err := deploymentUtils.ConstructKeylessTransaction(
		teleporterByteCodeFile,
		false,
		deploymentUtils.GetDefaultContractCreationGasPrice(),
	)
	Expect(err).Should(BeNil())

	// Create the local network instance
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()
	LocalNetworkInstance = localnetwork.NewLocalNetwork(
		ctx,
		"teleporter-test-local-network",
		warpGenesisTemplateFile,
		[]localnetwork.L1Spec{
			{
				Name:                       "A",
				EVMChainID:                 12345,
				TeleporterContractAddress:  teleporterContractAddress,
				TeleporterDeployedBytecode: teleporterDeployedBytecode,
				TeleporterDeployerAddress:  teleporterDeployerAddress,
				NodeCount:                  2,
			},
			{
				Name:                       "B",
				EVMChainID:                 54321,
				TeleporterContractAddress:  teleporterContractAddress,
				TeleporterDeployedBytecode: teleporterDeployedBytecode,
				TeleporterDeployerAddress:  teleporterDeployerAddress,
				NodeCount:                  2,
			},
		},
		2,
		2,
	)
	TeleporterInfo = utils.NewTeleporterTestInfo(LocalNetworkInstance.GetAllL1Infos())
	log.Info("Started local network")

	// Only need to deploy Teleporter on the C-Chain since it is included in the genesis of the L1 chains.
	_, fundedKey := LocalNetworkInstance.GetFundedAccountInfo()
	TeleporterInfo.DeployTeleporterMessenger(
		ctx,
		LocalNetworkInstance.GetPrimaryNetworkInfo(),
		teleporterDeployerTransaction,
		teleporterDeployerAddress,
		teleporterContractAddress,
		fundedKey,
	)
	for _, l1 := range LocalNetworkInstance.GetAllL1Infos() {
		TeleporterInfo.SetTeleporter(teleporterContractAddress, l1)
		TeleporterInfo.InitializeBlockchainID(l1, fundedKey)
		TeleporterInfo.DeployTeleporterRegistry(l1, fundedKey)
	}
})

var _ = ginkgo.AfterSuite(func() {
	LocalNetworkInstance.TearDownNetwork()
	LocalNetworkInstance = nil
})

var _ = ginkgo.Describe("[Validator manager integration tests]", func() {
	// ICTT tests

	ginkgo.It("Transfer an ERC20 token between two L1s",
		ginkgo.Label(icttLabel, erc20TokenHomeLabel, erc20TokenRemoteLabel),
		func() {
			icttFlows.ERC20TokenHomeERC20TokenRemote(LocalNetworkInstance, TeleporterInfo)
		})
	ginkgo.It("Transfer a native token to an ERC20 token",
		ginkgo.Label(icttLabel, nativeTokenHomeLabel, erc20TokenRemoteLabel),
		func() {
			icttFlows.NativeTokenHomeERC20TokenRemote(LocalNetworkInstance, TeleporterInfo)
		})
	ginkgo.It("Transfer a native token to a native token",
		ginkgo.Label(icttLabel, nativeTokenHomeLabel, nativeTokenRemoteLabel),
		func() {
			icttFlows.NativeTokenHomeNativeDestination(LocalNetworkInstance, TeleporterInfo)
		})
	ginkgo.It("Transfer an ERC20 token with ERC20TokenHome multi-hop",
		ginkgo.Label(icttLabel, erc20TokenHomeLabel, erc20TokenRemoteLabel, multiHopLabel),
		func() {
			icttFlows.ERC20TokenHomeERC20TokenRemoteMultiHop(LocalNetworkInstance, TeleporterInfo)
		})
	ginkgo.It("Transfer a native token with NativeTokenHome multi-hop",
		ginkgo.Label(icttLabel, nativeTokenHomeLabel, erc20TokenRemoteLabel, multiHopLabel),
		func() {
			icttFlows.NativeTokenHomeERC20TokenRemoteMultiHop(LocalNetworkInstance, TeleporterInfo)
		})
	ginkgo.It("Transfer an ERC20 token to a native token",
		ginkgo.Label(icttLabel, erc20TokenHomeLabel, nativeTokenRemoteLabel),
		func() {
			icttFlows.ERC20TokenHomeNativeTokenRemote(LocalNetworkInstance, TeleporterInfo)
		})
	ginkgo.It("Transfer a native token with ERC20TokenHome multi-hop",
		ginkgo.Label(icttLabel, erc20TokenHomeLabel, nativeTokenRemoteLabel, multiHopLabel),
		func() {
			icttFlows.ERC20TokenHomeNativeTokenRemoteMultiHop(LocalNetworkInstance, TeleporterInfo)
		})
	ginkgo.It("Transfer a native token to a native token multi-hop",
		ginkgo.Label(icttLabel, nativeTokenHomeLabel, nativeTokenRemoteLabel, multiHopLabel),
		func() {
			icttFlows.NativeTokenHomeNativeTokenRemoteMultiHop(LocalNetworkInstance, TeleporterInfo)
		})
	ginkgo.It("Transfer an ERC20 token using sendAndCall",
		ginkgo.Label(icttLabel, erc20TokenHomeLabel, erc20TokenRemoteLabel, sendAndCallLabel),
		func() {
			icttFlows.ERC20TokenHomeERC20TokenRemoteSendAndCall(LocalNetworkInstance, TeleporterInfo)
		})
	ginkgo.It("Registration and collateral checks",
		ginkgo.Label(icttLabel, erc20TokenHomeLabel, nativeTokenRemoteLabel, registrationLabel),
		func() {
			icttFlows.RegistrationAndCollateralCheck(LocalNetworkInstance, TeleporterInfo)
		})
	ginkgo.It("Transparent proxy upgrade",
		ginkgo.Label(icttLabel, erc20TokenHomeLabel, erc20TokenRemoteLabel, upgradabilityLabel),
		func() {
			icttFlows.TransparentUpgradeableProxy(LocalNetworkInstance, TeleporterInfo)
		})
})
