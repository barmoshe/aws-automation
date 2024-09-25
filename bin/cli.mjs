#!/usr/bin/env node

import inquirer from "inquirer";
import { mainMenu } from "../src/tasks/mainMenu.mjs";
import { handleError } from "../src/utils/errorHandlers.mjs";

(async () => {
  try {
    console.log("Welcome to the AWS Automation Script");
    await mainMenu();
  } catch (error) {
    handleError(error);
  }
})();
