package com.fitty.meal_.service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.Arrays;
import java.util.List;

@SpringBootApplication
public class Application {

	public static void main(String[] args) {
		int amount5 = 20;
		int[] coins5 = {2, 3, 5};
		int result5 = change(amount5, coins5);
		System.out.println("Number of combinations for amount " + amount5 + " with coins " + Arrays.toString(coins5) + ": " + result5);
		SpringApplication.run(Application.class, args);
	}
	public static int change(int amount, int[] coins) {
		// Initialize a DP array where dp[i] will store the number of combinations for amount i
		int[] dp = new int[amount + 1];
		dp[0] = 1; // Base case: There's one way to make the amount 0 (no coins)

		// Iterate over each coin denomination
		for (int coin : coins) {
			// Update the DP array for all amounts from coin to amount
			for (int x = coin; x <= amount; x++) {
				dp[x] += dp[x - coin];
				// Uncomment the line below for debugging purposes to trace computation
				// System.out.println("dp[" + x + "] += dp[" + (x - coin) + "] (" + dp[x - coin] + "), new dp[" + x + "] = " + dp[x]);
			}
		}

		return dp[amount];
	}
}
