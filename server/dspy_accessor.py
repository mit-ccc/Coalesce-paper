import json
import time
from enum import Enum
import re
import threading

import dspy
from dspy_modules import *
from passwords import open_ai_api_key

GPT3_MODEL = 'gpt-3.5-turbo'
# GPT4_MODEL = 'gpt-4-0125-preview'
GPT4_MODEL = 'gpt-4o-2024-05-13'
MAX_TRIES = 5


class DSPyModule(Enum):
    REWORD_QUESTION_FROM_REQUEST = "RewordQuestionFromRequestModule"
    REWORD_QUESTION = "RewordQuestionModule"
    SWITCH_RESPONSE_FORMAT = "SwitchResponseFormatModule"
    ASSESS_READABILITY = "AssessReadabilityModule"
    ASSESS_BIAS = "AssessBiasModule"
    ASSESS_SPECIFICITY = "AssessSpecificityModule"
    CLEAN_RATIONALE = "CleanRationaleModule"
    REWRITE_QUESTION = "RewriteQuestionModule"
    CHECK_QUESTION = "CheckQuestionModule"
    ASSESS_QUESTIONS = "AssessQuestionsModule"
    CLASSIFY_QUESTION = "ClassifyQuestionTypeModule"
    CHECK_PROMPT = "CheckPromptModule"
    CREATE_DRAFT = "CreateDraftModule"
    DETECT_TOPICS = "DetectTopicsModule"
    CLASSIFY_TOPICS = "ClassifyTopicsModule"
    ADD_QUESTIONS_TO_TOPIC = "AddQuestionsToTopicModule"
    REMOVE_QUESTIONS_FROM_TOPIC = "RemoveQuestionsInTopicModule"


MODULES = {
    DSPyModule.REWORD_QUESTION_FROM_REQUEST: RewordQuestionFromRequestModule(),
    DSPyModule.REWORD_QUESTION: RewordQuestionModule(),
    DSPyModule.SWITCH_RESPONSE_FORMAT: SwitchResponseFormatModule(),
    DSPyModule.ASSESS_READABILITY: AssessReadabilityModule(),
    DSPyModule.ASSESS_BIAS: AssessBiasModule(),
    DSPyModule.ASSESS_SPECIFICITY: AssessSpecificityModule(),
    DSPyModule.CLEAN_RATIONALE: CleanRationaleModule(),
    DSPyModule.REWRITE_QUESTION: RewriteQuestionModule(),
    DSPyModule.CHECK_QUESTION: CheckQuestionModule(),
    DSPyModule.ASSESS_QUESTIONS: AssessQuestionsModule(),
    DSPyModule.CLASSIFY_QUESTION: ClassifyQuestionTypeModule(),
    DSPyModule.CHECK_PROMPT: CheckPromptModule(),
    DSPyModule.CREATE_DRAFT: CreateDraftModule(),
    DSPyModule.DETECT_TOPICS: DetectTopicsModule(),
    DSPyModule.CLASSIFY_TOPICS: ClassifyTopicsModule(),
    DSPyModule.ADD_QUESTIONS_TO_TOPIC: AddQuestionsToTopicModule(),
    DSPyModule.REMOVE_QUESTIONS_FROM_TOPIC: RemoveQuestionsInTopicModule()
}

OUTPUT_FORMATS = {
    DSPyModule.REWORD_QUESTION_FROM_REQUEST: "list",
    DSPyModule.REWORD_QUESTION: "list",
    DSPyModule.SWITCH_RESPONSE_FORMAT: "json",
    DSPyModule.ASSESS_READABILITY: "string",
    DSPyModule.ASSESS_BIAS: "string",
    DSPyModule.ASSESS_SPECIFICITY: "string",
    DSPyModule.CLEAN_RATIONALE: "string",
    DSPyModule.REWRITE_QUESTION: "list",
    DSPyModule.CHECK_QUESTION: "list",
    DSPyModule.ASSESS_QUESTIONS: "list",
    DSPyModule.CREATE_DRAFT: "list",
    DSPyModule.CLASSIFY_QUESTION: "string",
    DSPyModule.CHECK_PROMPT: "string",
    DSPyModule.DETECT_TOPICS: "string",
    DSPyModule.CLASSIFY_TOPICS: "string",
    DSPyModule.ADD_QUESTIONS_TO_TOPIC: "list",
    DSPyModule.REMOVE_QUESTIONS_FROM_TOPIC: "list"
}


class DSPyAccessor:

    def __init__(self, flask_app):
        self.flask_app = flask_app
        # if self.flask_app is not None:
        #     self.flask_app.logger.info("Initializing DSPyAccessor")
        self.gpt3_turbo = dspy.OpenAI(
            model=GPT3_MODEL, max_tokens=4096, api_key=open_ai_api_key)
        self.gpt4 = dspy.OpenAI(
            # NOTE: could increase max_tokens to 128K for GPT-4
            model=GPT4_MODEL, max_tokens=4096, api_key=open_ai_api_key)
        # set the default model to GPT-3.5-turbo
        dspy.configure(lm=self.gpt3_turbo)

    def get_module(self, module_name):
        return MODULES[module_name]

    def get_model_history(self, is_gpt4=False, n=1):
        if is_gpt4:
            return self.gpt4.inspect_history(n)
        else:
            return self.gpt3_turbo.inspect_history(n)

    def invoke_module(self, module_name, is_gpt4=False, **kwargs):
        if is_gpt4:
            with dspy.context(lm=self.gpt4):
                module = self.get_module(module_name)
                return module(**kwargs)
        else:
            module = self.get_module(module_name)
            if module_name == DSPyModule.CHECK_QUESTION:
                return module(self.gpt4, **kwargs)
            else:
                return module(**kwargs)

    def post_process(self, output_str, output_type):
        """
        Post-processing function to remove everything before the first 
        square bracket and after the last square bracket.

        If the output_type is "json" then do the same for the 
        first curly bracket and last curly bracket.
        """
        if output_type == "list":
            output_str = output_str[output_str.find("["):]
            output_str = output_str[:output_str.rfind("]") + 1]
        elif output_type == "json":
            output_str = output_str[output_str.find("{"):]
            output_str = output_str[:output_str.rfind("}") + 1]
        return output_str

    def process_enumerated_output(self, output_str):
        """
        Deal with a special case where the output_str is numbered JSOn objects instead of being a list of JSON objects.
        """
        # split the output_str by any number followed by a period and a space
        output_lst = re.split(r"\d+\. ", output_str)
        # iterate through and keep all the strings that are valid json
        outputs = []
        for i, item in enumerate(output_lst):
            try:
                item = self.post_process(item, "json")
                json.loads(item)
                outputs.append(item)
            except json.JSONDecodeError:
                continue
        # combine the outputs into a list as a string
        return "[" + ", ".join(outputs) + "]" if len(outputs) > 0 else "[]"

    def invoke_module_json_output(self, output_name, module_name, is_gpt4=False, **kwargs):
        """
        Keep invoking a module until it returns a json output
        """

        num_tries = 0

        in_correct_format = False

        while not in_correct_format and num_tries < MAX_TRIES:
            output = self.invoke_module(module_name, is_gpt4, **kwargs)
            output_field = self.post_process(
                output[output_name], OUTPUT_FORMATS[module_name])
            try:
                output_field_json = json.loads(output_field)
                # if the output is empty, then try again
                if len(output_field_json) == 0:
                    if self.flask_app is not None:
                        self.flask_app.logger.info("Empty output for %s in %s",
                                                output_name, module_name)
                        self.flask_app.logger.info(
                            "Output: %s", output[output_name])
                    else:
                        print("Empty output for %s in %s" %
                              (output_name, module_name))
                        print("Output: %s" % output[output_name])
                    num_tries += 1
                    kwargs["temp"] = kwargs["temp"]+0.0001*num_tries
                    continue
                in_correct_format = True
                # return the output as a dictionary output_field as the value of output_name
                output[output_name] = output_field
                return output
            except json.JSONDecodeError:
                # see if it's the special case where the output is enumerated JSON objects
                if OUTPUT_FORMATS[module_name] == "list":
                    output_field = self.process_enumerated_output(
                        output[output_name])
                    if len(json.loads(output_field)) > 0:
                        if self.flask_app is not None:
                            self.flask_app.logger.info(
                                "Processed enumerated output")
                        else:
                            print("Processed enumerated output")
                        new_output = output.copy()
                        new_output[output_name] = output_field
                        return new_output
                if self.flask_app is not None:
                    self.flask_app.logger.info("Invalid output format for %s in %s",
                                            output_name, module_name)
                    self.flask_app.logger.info("Output: %s", output[output_name])
                else:
                    print("Invalid output format for %s in %s" %
                          (output_name, module_name))
                    print("Output: %s" % output[output_name])
                num_tries += 1
                kwargs["temp"] = kwargs["temp"]+0.0001*num_tries

        return None

    def invoke_module_multiple_times(self, output_name, module_name, num_times, is_gpt4=False, **kwargs):
        """
        Invoke a module multiple times, return all outputs
        Use threading to speed up the process
        """
        # Original code without threading
        outputs = []

        for i in range(num_times):
            output = self.invoke_module(module_name, is_gpt4, **kwargs)
            kwargs["temp"] = kwargs["temp"]+0.0001*i
            outputs.append(output[output_name])

        return outputs

        # # Code using threading
        # # NOTE: not using this because it actually increased the time slightly
        # outputs = []

        # def invoke_module_and_append_output(i):
        #     output = self.invoke_module(module_name, is_gpt4, **kwargs)
        #     kwargs["temp"] = kwargs["temp"]+0.0001*i
        #     outputs.append(output[output_name])

        # threads = []

        # for i in range(num_times):
        #     t = threading.Thread(target=invoke_module_and_append_output, args=(i,))
        #     threads.append(t)
        #     t.start()

        # for t in threads:
        #     t.join()

        # return outputs

    def format_cells(self, cells, external_fields=None, modality="survey"):
        """
        Format a list of cells to a format that the front-end can understand.
        Takes in cells (a list of JSON).
        Returns formatted_cells (a list of formatted JSON).
        """

        formatted_cells = []

        for cell in cells:
            # make sure the cell has the necessary fields
            if "main_text" not in cell or "cell_type" not in cell or "response_format" not in cell:
                continue
            if "description" not in cell:
                cell["description"] = ""
            # clean the response categories field
            if "response_categories" not in cell:
                if cell["response_format"] == "closed":
                    continue
                cell["response_categories"] = []
            # if the description field doesn't exist, then create it and set it to empty string
            if "description" not in cell:
                cell["description"] = ""
            # add the cell to formatted_cells
            formatted_cell = {
                "cell_details": {
                    "cell_type": cell["cell_type"],
                    "response_format": cell["response_format"],
                    "description": cell["description"],
                    "main_text": cell["main_text"],
                    "response_categories": cell["response_categories"]
                },
            }
            # iterate through external_fields and add them to formatted_cell
            if external_fields is not None:
                for field in external_fields:
                    # special case for time_estimate
                    if field == "time_estimate" and "time_estimate" not in cell:
                        formatted_cell[field] = self.estimate_time(
                            cell, modality)
                    else:
                        formatted_cell[field] = cell[field]
            # add formatted_cell to formatted_cells
            formatted_cells.append(formatted_cell)

        return formatted_cells

    def map_cell_detail_to_cell_id(self, cell_details, mapping, external_fields=None):
        """
        Map cell_details to cell_id based on the main_text field in mapping.
        """
        result = []
        for cell in cell_details:
            for cell_id, item in mapping.items():
                if cell["main_text"].strip() == item["main_text"].strip():
                    formatted_cell = {
                        "cell_id": cell_id,
                    }
                    if external_fields is not None:
                        for field in external_fields:
                            formatted_cell[field] = cell[field]
                    result.append(formatted_cell)
                    break
        return result

    def format_string(self, input_string):
        """
        Remove leading and trailing quotes and whitespaces from a string
        """
        return input_string.strip().strip('"')

    def estimate_time(self, cell_details, modality, num_people=6):
        """
        Estimate the time for a cell given the modality (interview, survey, or conversation_guide)
        Estimations are done in a deterministic way based on the cell_type and response_format and size
        """
        time_estimate = 0
        # check if cell is a question or text
        if cell_details["cell_type"] == "question":
            # check if cell is open or closed
            if cell_details["response_format"] == "open":
                reading_time = len(cell_details["main_text"].split()) / 100
                # check the modality
                if modality == "survey" or modality == "interview":
                    time_estimate = reading_time + 3
                else:
                    time_estimate = reading_time + 0.5 + (1*num_people)
            else:
                # get the number of words in all the response categories
                num_words_categories = sum(
                    [len(x["text"].split()) for x in cell_details["response_categories"]])
                reading_time = (
                    len(cell_details["main_text"].split()) + num_words_categories) / 100
                # check the modality
                if modality == "survey":
                    time_estimate = reading_time + 0.5
                elif modality == "interview":
                    time_estimate = reading_time + 1
                else:
                    time_estimate = reading_time + 0.5 + (0.5*num_people)
        else:
            # if cell is text, then estimate time based on the number of words in main_text divided by 100
            time_estimate = len(cell_details["main_text"].split()) / 100
        return round(time_estimate, 1)

    def format_project(self, outputs, modality):
        """
        Format the output of step 2 prompts to a format that the front-end can understand.
        Outputs is a dict with keys = title and sections 
        """
        sections = json.loads(outputs["sections"])

        # format the project title
        # if the outputs["title"] is actually a string of a json, then get the value of the title key
        try:
            if "{" in outputs["title"] and "}" in outputs["title"]:
                title_output = json.loads(
                    self.post_process(outputs["title"], "json"))

                if "Title" in title_output:
                    project_title = title_output["Title"]
                elif "title" in title_output:
                    project_title = title_output["title"]
                else:
                    project_title = "Untitled Project"
            else:
                project_title = outputs["title"]

        except Exception as error:
            if self.flask_app is not None:
                self.flask_app.logger.info("Error in formatting project title: %s",
                                        error)
            else:
                print("Error in formatting project title: %s" % error)
            project_title = "Untitled Project"

        # remove any "Title: " from the project title
        project_title = project_title.replace("Title:", "")
        project_title = self.format_string(project_title)
        if self.flask_app is not None:
            self.flask_app.logger.info("Formatted project title: %s",
                                    project_title)
        else:
            print("Formatted project title: %s" % project_title)

        formatted_project = {
            "project_title": project_title,
            "sections": []
        }

        formatted_cells = []

        # clean up sections
        # iterate through each section and cell
        for i, section in enumerate(sections):
            formatted_section = {
                "id": section["id"],
                "title": section["title"],
                # "time_estimate": section["time_estimate"],
                "cells": []
            }
            # add formatted_section to formatted_project
            formatted_project["sections"].append(formatted_section)
            # iterate through cells to populate formatted_cells
            for cell in section["cells"]:
                # make sure the cell has the necessary fields
                if "main_text" not in cell or "cell_type" not in cell or "response_format" not in cell:
                    continue
                if "rationale" not in cell:
                    cell["rationale"] = ""
                # clean the response categories field
                if "response_categories" not in cell:
                    if cell["response_format"] == "closed":
                        continue
                    cell["response_categories"] = []
                # wrap the cell in a cell_details field
                new_cell = {
                    "section_index": i,
                    "cell_details": {
                        "cell_type": cell["cell_type"],
                        "response_format": cell["response_format"],
                        "description": cell["rationale"],
                        "main_text": cell["main_text"],
                        "response_categories": cell["response_categories"]
                    },
                    # "question_type": "",
                    "last_updated": "",
                    # "checks": [],
                    # "last_run_check": "",
                    "human_ai_status": "ai",
                    "ai_rationale": cell["rationale"],
                    "time_estimate": cell["time_estimate"] if "time_estimate" in cell else self.estimate_time(cell, modality),
                }
                # add new_cell to formatted_cells
                formatted_cells.append(new_cell)
        return {"project": formatted_project, "cells": formatted_cells}

    def format_context(self, context):
        """
        Format the context from the front-end into one big string.
        Context is a dict
        """
        # iterate through each value in context and add it to the big string
        formatted_context = ""
        for key, value in context.items():
            # add main_text field to formatted_context
            formatted_context = formatted_context + \
                f"### {value["cell_details"]["main_text"]}\n"
            # response field to formatted_context
            formatted_context = formatted_context + f"{value["response"]}"
            # if applicable, add the part 2 response
            if "part_2_response" in value:
                formatted_context += f": {value["part_2_response"]}"
            # if we aren't at the last value, add a newline
            if key != list(context.keys())[-1]:
                formatted_context = formatted_context + "\n\n"
        return formatted_context

    def format_list_to_string(self, input_lst):
        """
        Format a list of strings (advice or ignored warnings) into one string separated by semicolons.
        """
        if len(input_lst) == 0:
            return ""
        return "; ".join(input_lst)

    def format_string_to_list(self, input_str, var_name=""):
        """
        Format one big string into a list.
        """
        if input_str == "":
            return []
        output = []
        # if var_name is not empty, then check if the string contains the var_name (case insensitive) followed by a colon
        if var_name != "":
            if var_name.lower() + ":" in input_str.lower():
                # remove the var_name and colon from the string while preserving the rest of the string
                input_str = input_str[input_str.lower().find(
                    var_name.lower() + ":") + len(var_name) + 1:]
                # remove any leading whitespace
                input_str = self.format_string(input_str)
        # if the string is separated by newline characters, split by that
        if "\n" in input_str:
            output = input_str.split("\n")
            # if any of the strings contains a semicolon, split by that as well
            new_output = []
            for item in output:
                if "; " in item:
                    new_output.extend(item.split("; "))
                else:
                    new_output.append(item)
            output = new_output
        # otherwise, split by semicolons
        else:
            output = input_str.split("; ")
        # remove any empty strings and remove any numbers at the beginning of each string
        output = [x.lstrip("1234567890. ") for x in output if x != ""]
        # remove any punctuation at the beginning or end of each string
        output = [x.strip(".,;:!?") for x in output]
        return output

    def filter_list(self, sub_lst, parent_lst):
        """
        Remove everything in sub_lst that isn't in parent_lst.
        """
        # If sub_list contains one element whcih is None, then return empty list
        if len(sub_lst) == 1 and sub_lst[0] == "None":
            return []
        return [x for x in sub_lst if x in parent_lst]

    def clean_list_of_jsons(self, input_lst, fields_to_keep):
        """
        Clean a list of JSONs by removing all fields except for fields_to_keep.
        """
        output_lst = []
        for item in input_lst:
            new_item = {key: item[key]
                        for key in item if key in fields_to_keep}
            output_lst.append(new_item)
        return output_lst

    def clean_outputs_from_topic_classification(self, outputs, all_topics, pre_selected_topics):
        """
        Clean the outputs from the topic classification module assuming model was called multiple times.
        Find intersection of new topics and union of pre-selected topics.
        """
        verified_topics = []
        new_topics = []
        # iterate through each output and process them into lists
        # and then find the intersection of the new topics and the union of the pre-selected topics
        for output in outputs:
            cleaned_output = self.filter_list(self.format_string_to_list(
                output, "classified topics"), all_topics)
            # figure out which topics are new and which are in pre_selected_topics
            new_topics.append(
                list(set(cleaned_output) - set(pre_selected_topics)))
            # get intersection of cleaned_output and pre_selected_topics
            verified_topics.extend(list(set.intersection(
                set(cleaned_output), set(pre_selected_topics))))

        # get the intersection of the lists in new_topics
        final_new_topics = list(set.intersection(*map(set, new_topics)))
        final_verified_topics = list(set(verified_topics))
        # concatenate the two lists and return
        return final_verified_topics + final_new_topics


# Test out DSPyAccessor
if __name__ == '__main__':

    start_time = time.time()

    dspya = DSPyAccessor(None)

    # # testing estimate_time
    # test_cell_details = {
    #     "cell_type": "question",
    #     "response_format": "closed",
    #     "description": "",
    #     "main_text": "Which of the following park amenities do you use?",
    #     "response_categories": [
    #         {
    #             "id": 0,
    #             "text": "Playground"
    #         },
    #         {
    #             "id": 1,
    #             "text": "Tennis courts"
    #         },
    #         {
    #             "id": 2,
    #             "text": "Basketball courts"
    #         },
    #         {
    #             "id": 3,
    #             "text": "Pickleball courts"
    #         }
    #     ]
    # }

    # test_modality = "conversation_guide"

    # print(dspya.estimate_time(test_cell_details, test_modality))

    # # testing process_enumerated_output
    # test_output = """Generate a paragraph of text that describes the importance of parks in a community. Include information about the benefits of parks, such as providing a space for people to relax, exercise, and connect with nature. Mention how parks can improve mental and physical health, promote social interaction, and enhance the overall quality of life for residents. Discuss the role of parks in supporting biodiversity, preserving green space, and mitigating the effects of climate change. Highlight the economic value of parks, such as attracting tourists, increasing property values, and supporting local businesses. Conclude by emphasizing the importance of maintaining and investing in parks to ensure that they remain accessible, safe, and enjoyable for all community members.

    # 1. {"cell_type": "text", "response_format": "open", "main_text": "Generate a paragraph of text that describes the importance of parks in a community. Include information about the benefits of parks, such as providing a space for people to relax, exercise, and connect with nature. Mention how parks can improve mental and physical health, promote social interaction, and enhance the overall quality of life for residents. Discuss the role of parks in supporting biodiversity, preserving green space, and mitigating the effects of climate change. Highlight the economic value of parks, such as attracting tourists, increasing property values, and supporting local businesses. Conclude by emphasizing the importance of maintaining and investing in parks to ensure that they remain accessible, safe, and enjoyable for all community members.", "rationale": "This text provides a comprehensive overview of the importance of parks in a community, highlighting their various benefits and values. It emphasizes the role of parks in promoting health, social interaction, biodiversity, and economic growth, and underscores the need to preserve and invest in parks for the well-being of residents."}
    # 2. {"cell_type": "question", "response_format": "closed", "main_text": "Which of the following park amenities do you use?", "response_categories": [{"id": 0, "text": "Playground"}, {"id": 1, "text": "Tennis courts"}, {"id": 2, "text": "Basketball courts"}, {"id": 3, "text": "Pickleball courts"}], "rationale": "This question is designed to gather information about the park amenities that community members use most frequently. By identifying the amenities that are most popular, the Parks Department can prioritize maintenance and improvements to better serve residents."}
    # 3. {"cell_type": "question", "response_format": "open", "main_text": "How much do you trust your local government's decisions on public parks and how often do you visit these parks?", "rationale": "This question has low readability. It combines two different inquiries into one sentence, which can confuse respondents. Separating the questions will improve clarity and ensure respondents can address each part individually."}"""

    # test_cleaned_output = dspya.process_enumerated_output(test_output)
    # print(json.dumps(json.loads(test_cleaned_output), indent=4))

    # test_input_interview = """### What is the problem to be solved or the decision to be made?
    #     The Parks Department ("PD") of a relatively small Massachusetts city (“Freeburg”) was recently granted state funds to make improvements to local parks. The PD doesn’t often receive grants of this size, so they want to make sure they use the funds effectively; if they use all the funds, they may be eligible for another grant next year.

    #     Freeburg has 13 parks. Some are quite small, and would only require minimal improvements (e.g., tree-planting, de-weeding), whereas others will require major improvements to address safety and usability concerns.

    #     Parks in wealthier neighborhoods of Freeburg tend to be nicer, which some residents believe may reflect a discrepancy in how tax funds are used and distributed by the city. The residents who take issue with these distributions tend to be lower-income and tend to live farther away from these parks, which have “higher-class” amenities, like tennis courts, public bathrooms, and water fountains with ground-level dog-bowl attachments.

    #     ### What information is needed from the public to make the decision?
    #     The parks were once well-kept, but in recent years, have been in a state of disarray, reflecting economic challenges that hit Freeburg hard during the COVID-19 pandemic. The PD needs to interview residents of the Freeburg community to understand their needs, interests, and priorities as they relate to the local parks; this information will be used to inform what kinds of improvements are made to the parks.

    #     The PD acknowledges that some improvements made by grant funds may lead to downstream costs that would not be covered by the grant, but the PD wishes to explore these anyway, due to their impact and long-term value for community members. For example, installing stationary trash and recycling bins in each park will help to reduce litter and improve the health and safety of the parks. However, while the state grant would pay for these bins to be installed, they would not pay for any future repairs or replacements, nor would they pay for the bins to be emptied regularly, which would be the task of the local Waste Management ("WM") service maintained by the city.

    #     ### What region is the engagement focused on? (e.g., city, county, state, national, etc.)
    #     Freeburg

    #     ### Is the region urban, suburban, or rural?
    #     Suburban

    #     ### What groups of people will be affected by the outcome of the decision?
    #     Some of the parks sit on the line with a nearby municipality, whose residents often use the parks. This may be viewed as either a challenge or opportunity by Freeburg residents, who may wish for the improved parks to be kept for their own private use, or who may wish for the parks to be shared (as they have been in the past) to expand the kinds of activities that the parks may host (for example, elementary school sporting events).

    #     There are several groups of constituents in the city, marked by demographic and geographic differences. Freeburg has a lower-altitude downtown (“DT”) that tends to have lower-income housing, in part due to historically long-standing social divisions, and in part due to the relatively high rate of flooding. The DT area has most of the city’s parks, but they tend to be far worse in quality, and are commonly policed (to many residents’ discomfort) to mitigate perceived issues with crime, which may or may not be the case. The DT area houses about 70% of the city’s residents, who are primarily from minority backgrounds. Freeburg also has a higher-altitude uptown (“UT”) area, whose residents tend to be higher-income. The UT area is the city’s financial and commerce district; as such, it brings in more out-of-city tourism and houses more of the city’s long-standing shopping (e.g., malls) entertainment venues (e.g., movie theaters). Residents of Freeburg are also divided by language. About 40% of the city’s residents are primarily Spanish-speaking, 8% are primarily Haitian-speaking, and 52% are primarily English-speaking. Throughout the city, signage (specifically, the languages used on public signage, such as those placed on parks) are an ongoing problem.

    #     ### Which of these groups are you engaging?
    #     We will engage with residents in both the lower-altitude downtown (“DT”) and higher-altitude uptown (“UT”) areas.

    #     ### What form of engagement (e.g., virtual convenings, one-on-one interviews, focus groups, surveys) will best solicit the input needed from the communities you hope to engage?
    #     One-on-one semi-structured interviews

    #     ### What is the maximum amount of time in minutes you can expect people to spend on the engagement? (e.g., 5 minutes, 30 minutes, 60 minutes, etc.)
    #     60 minutes maximum

    #     ### What is the breakdown of open-ended and close-ended questions?
    #     80 percent of questions are open-ended and the remaining are close-ended"""

    # test_input_survey = """### What is the problem to be solved or the decision to be made?
    #     The Parks Department ("PD") of a relatively small Massachusetts city (“Freeburg”) was recently granted state funds to make improvements to local parks. The PD doesn’t often receive grants of this size, so they want to make sure they use the funds effectively; if they use all the funds, they may be eligible for another grant next year.

    #     Freeburg has 13 parks. Some are quite small, and would only require minimal improvements (e.g., tree-planting, de-weeding), whereas others will require major improvements to address safety and usability concerns.

    #     Parks in wealthier neighborhoods of Freeburg tend to be nicer, which some residents believe may reflect a discrepancy in how tax funds are used and distributed by the city. The residents who take issue with these distributions tend to be lower-income and tend to live farther away from these parks, which have “higher-class” amenities, like tennis courts, public bathrooms, and water fountains with ground-level dog-bowl attachments.

    #     ### What information is needed from the public to make the decision?
    #     The parks were once well-kept, but in recent years, have been in a state of disarray, reflecting economic challenges that hit Freeburg hard during the COVID-19 pandemic. The PD needs to survey the residents of the Freeburg community to understand their needs, interests, and priorities as they relate to the local parks; this information will be used to inform what kinds of improvements are made to the parks.

    #     The PD acknowledges that some improvements made by grant funds may lead to downstream costs that would not be covered by the grant, but the PD wishes to explore these anyway, due to their impact and long-term value for community members. For example, installing stationary trash and recycling bins in each park will help to reduce litter and improve the health and safety of the parks. However, while the state grant would pay for these bins to be installed, they would not pay for any future repairs or replacements, nor would they pay for the bins to be emptied regularly, which would be the task of the local Waste Management ("WM") service maintained by the city.

    #     ### What groups of people will be affected by the outcome of the decision?
    #     Some of the parks sit on the line with a nearby municipality, whose residents often use the parks. This may be viewed as either a challenge or opportunity by Freeburg residents, who may wish for the improved parks to be kept for their own private use, or who may wish for the parks to be shared (as they have been in the past) to expand the kinds of activities that the parks may host (for example, elementary school sporting events).

    #     There are several groups of constituents in the city, marked by demographic and geographic differences. Freeburg has a lower-altitude downtown (“DT”) that tends to have lower-income housing, in part due to historically long-standing social divisions, and in part due to the relatively high rate of flooding. The DT area has most of the city’s parks, but they tend to be far worse in quality, and are commonly policed (to many residents’ discomfort) to mitigate perceived issues with crime, which may or may not be the case. The DT area houses about 70% of the city’s residents, who are primarily from minority backgrounds. Freeburg also has a higher-altitude uptown (“UT”) area, whose residents tend to be higher-income. The UT area is the city’s financial and commerce district; as such, it brings in more out-of-city tourism and houses more of the city’s long-standing shopping (e.g., malls) entertainment venues (e.g., movie theaters). Residents of Freeburg are also divided by language. About 40% of the city’s residents are primarily Spanish-speaking, 8% are primarily Haitian-speaking, and 52% are primarily English-speaking. Throughout the city, signage (specifically, the languages used on public signage, such as those placed on parks) are an ongoing problem.

    #     ### Which of these groups are you engaging?
    #     We will engage with residents in both the lower-altitude downtown (“DT”) and higher-altitude uptown (“UT”) areas.

    #     ### What form of engagement (e.g., virtual convenings, one-on-one interviews, focus groups, surveys) will best solicit the input needed from the communities you hope to engage?
    #     Online survey

    #     ### What is the maximum amount of time in minutes you can expect people to spend on the engagement? (e.g., 5 minutes, 30 minutes, 60 minutes, etc.)
    #     10 minutes maximum

    #     ### What is the breakdown of open-ended and close-ended questions?
    #     20 percent of questions are open-ended and the remaining are close-ended"""

    # test_input_interview2 = """### What is the problem to be solved or the decision to be made?

    #     We are a group of municipal, industry, and thought leaders, gathering at a summit in Cambridge, Massachusetts to discuss the implications of using artificial intelligence technologies in education. During the summit, we will have breakout rooms during which some of us will be interviewing community members about their ideas and preferences. At the end of the summit, we will be putting together public recommendations that k-12 public schools will be using to determine how they will or won't use AI in their processes.

    #     ### What information is needed from the public to make the decision?

    #     We need to know the general preferences (hopes, concerns) that the public, especially people who work in k-12 or people who have children in or entering k-12 education, has about the use of AI in education. We already know from prior surveys that people in our community are very concerned with this issue, especially the use of AI to write essays for students, but there are still a lot of unknowns otherwise, and we get the sense that our community has a lot of other concerns that we haven't had a chance to understand yet.

    #     ### What groups of people will be affected by the outcome of the decision?

    #     Students, teachers, and parents will be primarily affected by the outcome of the decision here. In a less direct way, the broader workforce will be affected, because education has long-term implications for workforce training and efficacy. For example, parents around here seem to be concerned about the use of AI to augment or replace student work, which might leave students less prepared to handle necessary tasks in the workplace, given whatever profession they might end up in, but especially work that might involve reading, writing, and data analysis.

    #     ### Which of these groups are you engaging?

    #     We are most specifically trying to engage parents and teachers. We generally feel that we know where students stand on these issues.

    #     ### What form of engagement (e.g., virtual convenings, one-on-one interviews, focus groups, surveys) will best solicit the input needed from the communities you hope to engage?

    #     We'll most likely be doing break-out focus groups during our summit to better understand experiences and opinions within small groups of four to six people who share roles within the community (for example, parents in one group, teachers in another group).

    #     ### What is the maximum amount of time in minutes you can expect people to spend on the engagement? (e.g., 5 minutes, 30 minutes, 60 minutes, etc.)

    #     We want people to spend at most maybe 60 minutes in the actual conversations/interviews. Not everyone will be talking at the same time, so honestly, each person might just be speaking for about 5 minutes or so. We really aren't sure.

    #     ### What is the breakdown of open-ended and close-ended questions?

    #     95"""

    # test_input_conversation_guide = """### What is the problem to be solved or the decision to be made?
    #     The Parks Department (""PD"") of a relatively small Massachusetts city (“Freeburg”) was recently granted state funds to make improvements to local parks. The PD doesn’t often receive grants of this size, so they want to make sure they use the funds effectively; if they use all the funds, they may be eligible for another grant next year.

    #     Freeburg has 13 parks. Some are quite small, and would only require minimal improvements (e.g., tree-planting, de-weeding), whereas others will require major improvements to address safety and usability concerns.

    #     Parks in wealthier neighborhoods of Freeburg tend to be nicer, which some residents believe may reflect a discrepancy in how tax funds are used and distributed by the city. The residents who take issue with these distributions tend to be lower-income and tend to live farther away from these parks, which have “higher-class” amenities, like tennis courts, public bathrooms, and water fountains with ground-level dog-bowl attachments.

    #     ### What information is needed from the public to make the decision?
    #     The parks were once well-kept, but in recent years, have been in a state of disarray, reflecting economic challenges that hit Freeburg hard during the COVID-19 pandemic. The PD needs to interview residents of the Freeburg community to understand their needs, interests, and priorities as they relate to the local parks; this information will be used to inform what kinds of improvements are made to the parks.

    #     The PD acknowledges that some improvements made by grant funds may lead to downstream costs that would not be covered by the grant, but the PD wishes to explore these anyway, due to their impact and long-term value for community members. For example, installing stationary trash and recycling bins in each park will help to reduce litter and improve the health and safety of the parks. However, while the state grant would pay for these bins to be installed, they would not pay for any future repairs or replacements, nor would they pay for the bins to be emptied regularly, which would be the task of the local Waste Management (""WM"") service maintained by the city.

    #     ### What region is the engagement focused on? (e.g., city, county, state, national, etc.)
    #     Freeburg

    #     ### Is the region urban, suburban, or rural?
    #     Suburban

    #     ### What groups of people will be affected by the outcome of the decision?
    #     Some of the parks sit on the line with a nearby municipality, whose residents often use the parks. This may be viewed as either a challenge or opportunity by Freeburg residents, who may wish for the improved parks to be kept for their own private use, or who may wish for the parks to be shared (as they have been in the past) to expand the kinds of activities that the parks may host (for example, elementary school sporting events).

    #     There are several groups of constituents in the city, marked by demographic and geographic differences. Freeburg has a lower-altitude downtown (“DT”) that tends to have lower-income housing, in part due to historically long-standing social divisions, and in part due to the relatively high rate of flooding. The DT area has most of the city’s parks, but they tend to be far worse in quality, and are commonly policed (to many residents’ discomfort) to mitigate perceived issues with crime, which may or may not be the case. The DT area houses about 70% of the city’s residents, who are primarily from minority backgrounds. Freeburg also has a higher-altitude uptown (“UT”) area, whose residents tend to be higher-income. The UT area is the city’s financial and commerce district; as such, it brings in more out-of-city tourism and houses more of the city’s long-standing shopping (e.g., malls) entertainment venues (e.g., movie theaters). Residents of Freeburg are also divided by language. About 40% of the city’s residents are primarily Spanish-speaking, 8% are primarily Haitian-speaking, and 52% are primarily English-speaking. Throughout the city, signage (specifically, the languages used on public signage, such as those placed on parks) are an ongoing problem.

    #     ### Which of these groups are you engaging?
    #     We will engage with residents in both the lower-altitude downtown (“DT”) and higher-altitude uptown (“UT”) areas.

    #     ### What form of engagement (e.g., virtual convenings, one-on-one interviews, focus groups, surveys) will best solicit the input needed from the communities you hope to engage?
    #     Community conversations with 4-6 people and one facilitator

    #     ### What is the maximum amount of time in minutes you can expect people to spend on the engagement? (e.g., 5 minutes, 30 minutes, 60 minutes, etc.)
    #     90 minutes maximum

    #     ### What is the breakdown of open-ended and close-ended questions?
    #     100 percent of questions are open-ended and the remaining are close-ended"""

    # test_input1 = {
    #     "question":
    #     {
    #         "cell_type": "question",
    #         "response_format": "closed",
    #         "description": "",
    #         "main_text": "Which of the following park amenities do you use?",
    #         "response_categories": [
    #             {
    #                 "id": 0,
    #                 "text": "Playground"
    #             },
    #             {
    #                 "id": 1,
    #                 "text": "Tennis courts"
    #             },
    #             {
    #                 "id": 2,
    #                 "text": "Basketball courts"
    #             },
    #             {
    #                 "id": 3,
    #                 "text": "Pickleball courts"
    #             }
    #         ]
    #     },
    #     "format": "survey",
    #     "reading_level": "third grade",
    #     "request": "Make this question more focused on different activities people can do in the park"
    # }

    # test_input2 = {
    #     "question": {
    #         "cell_type": "question",
    #         "response_format": "open",
    #         "description": "",
    #         "main_text": "How much do you trust your local government's decisions on public parks, and how often do you visit these parks?",
    #         "response_categories": []
    #     },
    #     "format": "survey",
    #     "problem": "low readability",
    #     # "problem": "lack of specificity",
    #     "reading_level": "third grade",
    #     # "input_rationale": "This question has low readability. It combines two different inquiries into one sentence, which can confuse respondents. Separating the questions will improve clarity and ensure respondents can address each part individually.",
    #     "input_rationale": "produce the readability. We need to analyze the question for simplicity, clarity, and the presence of complex structures or jargon.",
    #     # "input_rationale": "Let's think step by step in order to determine the specificity. We first need to identify if the question measures only one underlying concept. In this case, the question combines two concepts: trust in local government decisions regarding public parks and frequency of park visits. Therefore, the question is not specific in measuring only one underlying concept.",
    #     "request": "Make this question anwerable for families"
    # }

    # test_input3 = {
    #     "question": {
    #         "cell_type": "question",
    #         "response_format": "open",
    #         "description": "",
    #         "main_text": "What is a favorite experience or memory you have at X Park?",
    #         "response_categories": []
    #     },
    #     "format": "survey",
    #     "reading_level": "third grade"
    # }

    # test_input4 = {
    #     "question": {
    #         "cell_type": "question",
    #         "response_format": "open",
    #         "description": "",
    #         "main_text": "(Optional) What steps do you think we need to take to achieve this ideal scenario?",
    #         "response_categories": []
    #     },
    #     "format": "conversation_guide",
    #     "reading_level": "third grade",
    #     "request": "Make this question focused on things that parents can do to help achieve the ideal scenario"
    # }

    # test_input = test_input2

    # test_input_str = json.dumps(test_input["question"])

    # # output_name = "rewritten_questions"

    # test_existing_questions = [
    #     {
    #         "cell_type": "question",
    #         "response_format": "open",
    #         "description": "This question asks participants to envision a positive future, fostering creative thinking and constructive ideas for AI implementation.",
    #         "main_text": "Imagine it is 5 years from now, and AI has been integrated into our schools. What does an ideal scenario look like to you?",
    #         "response_categories": []
    #     }
    # ]

    # # convert test_existing_questions to a string
    # test_existing_questions_str = json.dumps(test_existing_questions)

    # # test REWORD_QUESTION_FROM_REQUEST
    # output = dspya.invoke_module_json_output(**{"output_name": "rewordings",
    #                                             "module_name": DSPyModule.REWORD_QUESTION_FROM_REQUEST,
    #                                             "is_gpt4": False,
    #                                             "context": test_input_interview2,
    #                                             "existing_questions": test_existing_questions_str,
    #                                             "question": test_input_str,
    #                                             "format": test_input["format"],
    #                                             "request": test_input["request"],
    #                                             "return_rationale":False,
    #                                             "temp": 0.7003})
    # # format_cell
    # formatted_output = dspya.format_cells([json.loads(output["rewordings"])], ["time_estimate"], test_input["format"])
    # print(formatted_output)

    # # test REWORD_QUESTION

    # # rand_int = random.randint(1, 100)
    # output = dspya.invoke_module_json_output(**{"output_name": "rewordings",
    #                                             "module_name": DSPyModule.REWORD_QUESTION,
    #                                             "is_gpt4": False,
    #                                             "context": test_input_interview2,
    #                                             "existing_questions": test_existing_questions_str,
    #                                             "question": test_input_str,
    #                                             "format": test_input["format"],
    #                                             "return_rationale":False,
    #                                             "temp": 0.7002})
    # # print(output)
    # # format_cell
    # formatted_output = dspya.format_cells([json.loads(output["rewordings"])], ["time_estimate"], test_input["format"])
    # print(formatted_output)

    # # test SWITCH_RESPONSE_FORMAT
    # output = dspya.invoke_module_json_output(**{"output_name": "new_question",
    #                                             "module_name": DSPyModule.SWITCH_RESPONSE_FORMAT,
    #                                             "question": test_input_str,
    #                                             "return_rationale":False,
    #                                             "temp": 0.7001})
    # # format_cell
    # formatted_output = dspya.format_cells([json.loads(output["new_question"])], ["time_estimate"], "survey")
    # print(formatted_output)

    # # test ASSESS_READABILITY
    # output = dspya.invoke_module(**{"module_name": DSPyModule.ASSESS_READABILITY,
    #                                 "question": test_input_str,
    #                                 "reading_level": test_input["reading_level"],
    #                                 "return_rationale": True,
    #                                 "temp": 0.7002})
    # print(output)

    # # test ASSESS_SPECIFICITY
    # output = dspya.invoke_module(**{"module_name": DSPyModule.ASSESS_SPECIFICITY,
    #                                 "question": test_input_str,
    #                                 "return_rationale": True,
    #                                 "temp": 0.7001})
    # print(output)

    # # test ASSESS_BIAS
    # output = dspya.invoke_module(**{"module_name": DSPyModule.ASSESS_BIAS,
    #                                 "question": test_input_str,
    #                                 "return_rationale": True,
    #                                 "temp": 0.7001})
    # print(output)

    # # test CLEAN_RATIONALE
    # output = dspya.invoke_module(**{"module_name": DSPyModule.CLEAN_RATIONALE,
    #                                 "is_gpt4": False,
    #                                 "question": test_input_str,
    #                                 "problem": test_input["problem"],
    #                                 "input_rationale": test_input["input_rationale"],
    #                                 "return_rationale": False,
    #                                 "temp": 0.7003})
    # # print(output)

    # # test REWRITE_QUESTION
    # output = dspya.invoke_module_json_output(**{"output_name": "rewritten_questions",
    #                                             "module_name": DSPyModule.REWRITE_QUESTION,
    #                                             "is_gpt4": True,
    #                                             "context": test_input_survey,
    #                                             "question": test_input_str,
    #                                             "input_rationale": test_input["input_rationale"],
    #                                             "return_rationale":True,
    #                                             "temp": 0.7003})

    # # test CHECK_QUESTION
    # output = dspya.invoke_module_json_output(**{"output_name": "rewritten_questions",
    #                                             "module_name": DSPyModule.CHECK_QUESTION,
    #                                             "checks_to_ignore": [],
    #                                             # "checks_to_ignore": ["bias", "readability", "specificity"],
    #                                             "context": test_input_survey,
    #                                             "question": test_input["question"],
    #                                             "reading_level": test_input["reading_level"],
    #                                             "temp": 0.7001})
    # # print output as formatted json
    # # print(json.dumps(output['cleaned_scores'], indent=4))
    # output_questions = json.loads(output['rewritten_questions'])
    # print(json.dumps(output_questions, indent=4))
    # initial_flags = [x["check_type"] for x in output['cleaned_scores']]

    # # run ASSESS_QUESTIONS on output_questions
    # scores = dspya.invoke_module(**{"module_name": DSPyModule.ASSESS_QUESTIONS,
    #                                 "questions": output_questions,
    #                                 "initial_flags": initial_flags,
    #                                 "reading_level": test_input["reading_level"],
    #                                 "temp": 0.7013})
    
    # print(json.dumps(scores, indent=4))

    # #  test ADD_QUESTIONS_TO_TOPIC

    # test_topic = "Favorite park activities"

    # test_existing_questions = [
    #     {
    #         "cell_type": "question",
    #         "response_format": "open",
    #         "description": "",
    #         "main_text": "What is your favorite park activity?",
    #         "response_categories": []
    #     },
    #     {
    #         "cell_type": "question",
    #         "response_format": "closed",
    #         "description": "",
    #         "main_text": "Do you enjoy playing sports in the park?",
    #         "response_categories": [
    #             {"id": 0, "text": "Yes"},
    #             {"id": 1, "text": "No"}
    #         ]
    #     }
    # ]

    # # convert test_existing_questions to a string
    # test_existing_questions_str = json.dumps(test_existing_questions)

    # test_sections = [
    #     {
    #         "id": 0,
    #         "title": "Introduction"
    #     },
    #     {
    #         "id": 1,
    #         "title": "Demographics"
    #     },
    #     {
    #         "id": 2,
    #         "title": "General Usage"
    #     },
    #     {
    #         "id": 3,
    #         "title": "Improvement Possibilities"
    #     }
    # ]

    # # convert test_sections to a string
    # test_sections_str = json.dumps(test_sections)

    # output_name = "additional_questions"

    # output = dspya.invoke_module_json_output(**{"output_name": output_name,
    #                                             "module_name": DSPyModule.ADD_QUESTIONS_TO_TOPIC,
    #                                             "is_gpt4": True,
    #                                             "context": test_input_survey,
    #                                             "topic": test_topic,
    #                                             "existing_questions": test_existing_questions_str,
    #                                             "sections": test_sections_str,
    #                                             "return_rationale": False,
    #                                             "temp": 0.7001})

    # # convert output to a json
    # formatted_output = dspya.format_cells(json.loads(output[output_name]), ["time_estimate", "rationale", "section_id"])
    # print(json.dumps(formatted_output, indent=4))

    # # print the number of questions added
    # print(f"Number of questions added: {len(formatted_output)}")

    # #  test REMOVE_QUESTIONS_FROM_TOPIC

    # test_topic = "Favorite park activities"

    # test_existing_questions = [
    #     {
    #         "cell_type": "question",
    #         "response_format": "open",
    #         "description": "",
    #         "main_text": "What is your favorite park activity?",
    #         "response_categories": []
    #     },
    #     {
    #         "cell_type": "question",
    #         "response_format": "closed",
    #         "description": "",
    #         "main_text": "Do you enjoy playing sports in the park?",
    #         "response_categories": [
    #             {"id": 0, "text": "Yes"},
    #             {"id": 1, "text": "No"}
    #         ]
    #     },
    #     {
    #         "cell_type": "question",
    #         "response_format": "closed",
    #         "description": "",
    #         "main_text": "Do you enjoy reading in the park?",
    #         "response_categories": [
    #             {"id": 0, "text": "Yes"},
    #             {"id": 1, "text": "No"}
    #         ]
    #     },
    #     {
    #         "cell_type": "question",
    #         "response_format": "closed",
    #         "description": "",
    #         "main_text": "Do you enjoy walking in the park?",
    #         "response_categories": [
    #             {"id": 0, "text": "Yes"},
    #             {"id": 1, "text": "No"}
    #         ]
    #     },
    #     {
    #         "cell_type": "question",
    #         "response_format": "closed",
    #         "description": "",
    #         "main_text": "Do you enjoy biking in the park?",
    #         "response_categories": [
    #             {"id": 0, "text": "Yes"},
    #             {"id": 1, "text": "No"}
    #         ]
    #     },
    #     {
    #         "cell_type": "question",
    #         "response_format": "open",
    #         "description": "",
    #         "main_text": "What is your favorite thing to do in the park?",
    #         "response_categories": []
    #     }
    # ]

    # # convert test_existing_questions to a string
    # test_existing_questions_str = json.dumps(test_existing_questions)

    # output_name = "questions_to_remove"

    # output = dspya.invoke_module_json_output(**{"output_name": output_name,
    #                                             "module_name": DSPyModule.REMOVE_QUESTIONS_FROM_TOPIC,
    #                                             "is_gpt4": True,
    #                                             "context": test_input_survey,
    #                                             "topic": test_topic,
    #                                             "number_of_questions_to_remove": "3",
    #                                             "existing_questions": test_existing_questions_str,
    #                                             "return_rationale": False,
    #                                             "temp": 0.7001})

    # # convert output to a json
    # formatted_output = json.loads(output[output_name])

    # print(json.dumps(formatted_output, indent=4))

    # test CREATE_DRAFT

    # output_name = "sections"

    # modality = "survey"

    # output = dspya.invoke_module_json_output(**{"output_name": output_name,
    #                                             "module_name": DSPyModule.CREATE_DRAFT,
    #                                             "is_gpt4": True,
    #                                             "context": test_input_interview2,
    #                                             "draft_type": "interview",
    #                                             "temp": 0.7001})

    # output = dspya.invoke_module_json_output(**{"output_name": output_name,
    #                                             "module_name": DSPyModule.CREATE_DRAFT,
    #                                             "is_gpt4": True,
    #                                             "context": test_input_survey,
    #                                             "draft_type": "survey",
    #                                             "temp": 0.7001})

    # output = dspya.invoke_module_json_output(**{"output_name": output_name,
    #                                             "module_name": DSPyModule.CREATE_DRAFT,
    #                                             "is_gpt4": True,
    #                                             "context": test_input_interview2,
    #                                             "draft_type": "conversation_guide",
    #                                             "temp": 0.7001})

    # formatted_output = dspya.format_project(output, modality)
    # print(json.dumps(formatted_output, indent=4))

    # # test DETECT_TOPICS
    # output = dspya.invoke_module(**{"module_name": DSPyModule.DETECT_TOPICS,
    #                                 "is_gpt4": True,
    #                                 "context": test_input_interview2,
    #                                 "return_rationale": False,
    #                                 "temp": 0.7003})
    # # print(output)
    # print(dspya.format_string_to_list(output["topics"], "topics"))

    # # test CLASSIFY_TOPICS

    # test_input = {
    #     "question": {
    #         "cell_type": "question",
    #         "response_format": "open",
    #         "description": "",
    #         # "main_text": "What is a favorite experience or memory you have at X Park?",
    #         # "main_text": "How often do you visit X Park?",
    #         # "main_text": "What color is the sky?",
    #         "main_text": "How much do you trust your local government's decisions on public parks and how often do you visit these parks?",
    #         "response_categories": []
    #     }
    # }

    # test_input_str = json.dumps(test_input["question"])

    # # test_topics = ["Negatives of Park", "Positives of Park", "Environmental Concerns about Park"]
    # test_topics = ["Current state of parks",
    #                "Desired improvements",
    #                "Economic disparities",
    #                "Safety and policing concerns",
    #                "Long-term maintenance costs",
    #                "Inclusivity and accessibility",
    #                "Language barriers",
    #                "Impact of neighboring municipality usage"]

    # test_topics_str = dspya.format_list_to_string(test_topics)

    # pre_selected_topics = ["Long-term maintenance costs"]
    # pre_selected_topics_str = dspya.format_list_to_string(pre_selected_topics)

    # outputs = dspya.invoke_module_multiple_times(**{"module_name": DSPyModule.CLASSIFY_TOPICS,
    #                                 "output_name": "classified_topics",
    #                                 "num_times": 3,
    #                                 "is_gpt4": True,
    #                                 "question": test_input_str,
    #                                 "all_topics": test_topics_str,
    #                                 "pre_selected_topics": pre_selected_topics_str,
    #                                 "return_rationale": False,
    #                                 "temp": 0.7001})

    # # print(outputs)
    # print(dspya.clean_outputs_from_topic_classification(outputs, test_topics, pre_selected_topics))

    # output = dspya.invoke_module(**{"module_name": DSPyModule.CLASSIFY_TOPICS,
    #                                 "is_gpt4": True,
    #                                 "question": test_input_str,
    #                                 "all_topics": test_topics_str,
    #                                 "pre_selected_topics": pre_selected_topics_str,
    #                                 "return_rationale": False,
    #                                 "temp": 0.7001})
    # # print(output)
    # output = dspya.format_string_to_list(output["classified_topics"], "classified topics")
    # print(dspya.filter_list(output, test_topics))

    # # test CHECK_QUESTION_TYPE
    # test_input = {
    #     "question": {
    #         "cell_type": "question",
    #         "response_format": "open",
    #         "description": "",
    #         "main_text": "What is a favorite experience or memory you have at X Park?",
    #         "response_categories": []
    #     },
    #     "reading_level": "third grade"
    # }

    # test_input_str = json.dumps(test_input["question"])

    # output = dspya.invoke_module(**{"module_name": DSPyModule.CLASSIFY_QUESTION,
    #                                  "question": test_input_str,
    #                                  "return_rationale": True,
    #                                  "temp": 0.7001})
    # print(output)

    # # test CHECK_PROMPT
    # # test_input = {
    # #     "context_question": "What information is needed from the public to make the decision?",
    # #     "user_response": "We need to know the general preferences (hopes, concerns) that the public, especially people who work in k-12 or people who have children in or entering k-12 education, has about the use of AI in education. We already know from prior surveys that people in our community are very concerned with this issue, especially the use of AI to write essays for students, but there are still a lot of unknowns otherwise, and we get the sense that our community has a lot of other concerns that we haven't had a chance to understand yet.",
    # #     "advice": "The information needed is specific and directly related to the problem or decision (e.g., 'We need to know what types of activities people would like to see in the park'); The information needed is not too broad (e.g., 'We need to know everything about the park' is too broad); The information needed is not too narrow (e.g., 'We need to know what color to paint the park benches' is too narrow); The information needed is not too technical or specialized (e.g., 'We need to know the chemical composition of the soil in the park' is too technical)",
    # #     "ignored_suggestions": ""
    # # }

    # test_input = {
    #     "context_question": "What form of engagement (e.g., virtual convenings, one-on-one interviews, focus groups, surveys) will best solicit the input needed from the communities you hope to engage?",
    #     "user_response": "We'll most likely be doing break-out focus groups during our summit to better understand experiences and opinions within small groups of four to six people who share roles within the community (for example, parents in one group, teachers in another group).",
    #     "advice": [
    #             "Response mentions how many people are expected to engage in total (e.g., 'We expect to engage 100 people')",
    #             "Response mentions where the survey, interviews, or conversations will be conducted (e.g., 'We will conduct a survey online and in person')",
    #             "For interviews, focus groups, or conversations, response mentions how much experience the interviewer or facilitator has (e.g., 'The interviewer has conducted interviews in the past')",
    #             "For focus groups or conversations, response mentions how many people will be in each group (e.g., 'We will have 4-6 people in each group')"
    #         ],
    #     "ignored_suggestions": ""
    # }

    # # convert advice to a string
    # advice_str = dspya.format_list_to_string(test_input["advice"])

    # output = dspya.invoke_module(**{"module_name": DSPyModule.CHECK_PROMPT,
    #                                 "context_question": test_input["context_question"],
    #                                 "user_response": test_input["user_response"],
    #                                 "advice": advice_str,
    #                                 "ignored_suggestions": test_input["ignored_suggestions"],
    #                                 "return_rationale": True,
    #                                 "temp": 0.7003})
    # # print(output)
    # print(dspya.format_string_to_list(output["suggestions"], "suggestions"))

    # print(f"Rationale is {output["rationale"]}")

    # # convert to json
    # rewordings = json.loads(output[output_name])

    # print(json.dumps(rewordings, indent=4))

    # print(dspya.get_model_history(is_gpt4=False, n=3))

    # print(dspya.get_model_history(is_gpt4=True, n=1))

    end_time = time.time()
    execution_time = end_time - start_time
    print("Execution time:", execution_time)
