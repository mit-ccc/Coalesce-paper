# Import libraries

import json
import pandas as pd

SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1z9LPg7-njYQ12EK4qI2ASSjS0s2rCCnsv6Jm8Nc9Ip8/export?format=csv&gid=847691564"

CONSTANTS = {
    "question_json_format": """{
        "cell_type": "question",
        "response_format": "open" or "closed",
        "time_estimate": number of minutes,
        "description": string,
        "main_text": string,
        "response_categories": empty list for open questions or list of JSONs with an "id" and "text" field for closed questions
    }""",
    "cell_details_json_format": """{
        "cell_type": "question",
        "response_format": "open" or "closed",
        "description": string,
        "main_text": string,
        "response_categories": empty list for open questions or list of JSONs with an "id" and "text" field for closed questions
    }""",
    "analyze_topic_question_json_format": """{
        "section_id": number,
        "cell_type": "question",
        "response_format": "open" or "closed",
        "time_estimate": number of minutes,
        "rationale": string,
        "main_text": string,
        "response_categories": empty list for open questions or list of JSONs with an "id" and "text" field for closed questions
    }""",
    "analyze_topic_deletion_question_json_format": """{
        "section_id": number,
        "cell_type": "question",
        "response_format": "open" or "closed",
        "rationale": string,
        "main_text": string,
        "response_categories": empty list for open questions or list of JSONs with an "id" and "text" field for closed questions
    }""",
    "analyze_topic_section_json_format": """{
        "id": section number starting from 0,
        "title": string,
    }""",
    "section_json_format": """{
        "id": section number starting from 0,
        "title": string,
        "cells": [
            {
                "cell_type": "question" or "text",
                "response_format": "open" or "closed",
                "time_estimate": number of minutes,
                "main_text": string,
                "rationale": string,
                "response_categories": empty list for open questions or list of JSONs with an "id" and "text" field for closed questions
            }
        ]
    }""",
    "json_formatting_message": """Return JSON objects in a list that is surrounded by square brackets. Do not number the items in the list. The list should be parsable by the json.loads() function in Python."""
}


def save_prompts_to_csv():
    """
    Save the prompts to a CSV file in the data subfolder
    """
    # read in the spreadsheet
    df_prompts = pd.read_csv(SPREADSHEET_URL)
    df_prompts.to_csv("data/prompts.csv", index=False)


def fill_in_constants(input_str):
    for key in CONSTANTS:
        input_str = input_str.replace("{"+key+"}", CONSTANTS[key])
    return input_str


def load_prompts(file):
    """
    Load the prompts from a CSV file or URL
    """
    return pd.read_csv(file)


def get_prompt_info(signature_name, df_prompts):
    """
    Get the prompt info for a given signature name
    Returns dictionary with the following keys:
    - is_optimized: whether the prompt is optimized using DSPy
    - signature_description: string
    - input_descriptions: json
    - output_descriptions: json
    - optimized_module: string (filename)
    """
    # make sure the signature name is in the dataframe
    if signature_name not in df_prompts["signature_name"].values:
        print(f"Signature name {signature_name} not found in the spreadsheet")
        return None

    # get row with the signature name
    row = df_prompts[df_prompts["signature_name"] == signature_name]

    # make sure there is only one row
    assert len(row) == 1, f"More than one row found for signature name {
        signature_name}"

    # get is_optimized (if the value in the is_optimized column is "Yes", then the prompt is optimized)
    is_optimized = row["is_optimized"].values[0] == "Yes"

    # get signature description
    signature_description = row["signature_description"].values[0]

    # get input descriptions and convert to json
    input_descriptions = json.loads(row["input_descriptions"].values[0])
    #  iterate through the input descriptions and fill in the constants
    for key in input_descriptions:
        input_descriptions[key] = fill_in_constants(input_descriptions[key])

    # get output descriptions
    output_descriptions = json.loads(row["output_descriptions"].values[0])
    #  iterate through the output descriptions and fill in the constants
    for key in output_descriptions:
        output_descriptions[key] = fill_in_constants(output_descriptions[key])

    # get optimized module
    optimized_module = row["optimized_module"].values[0]

    return {
        "is_optimized": is_optimized,
        "signature_description": signature_description,
        "input_descriptions": input_descriptions,
        "output_descriptions": output_descriptions,
        "optimized_module": optimized_module
    }


if __name__ == '__main__':
    save_prompts_to_csv()
