################################### Import Libraries ###################################
import json
import threading

import dspy
from get_prompt_info import get_prompt_info, load_prompts

OPTIMIZED_MODULES_PATH = "prompts/compiled_modules/" # Path to compiled_modules folder

CHECKS = {
    "readability": {
        "problem": "low readability",
        "all_scores": [
            "low",
            "medium",
            "high"
        ],
        "flagged_scores": [
            "low"
        ]
    },
    "bias": {
        "problem": "contains bias",
        "all_scores": [
            "true",
            "false"
        ],
        "flagged_scores": [
            "true"
        ]
    },
    "specificity":
    {
        "problem": "lack of specificity",
        "all_scores": [
            "pass",
            "fail"
        ],
        "flagged_scores": [
            "fail"
        ]
    }
}

PROMPTS_PATH = "prompts/prompts.csv"

df_prompts = load_prompts(PROMPTS_PATH)

######################################### DSPy for Step 2 #########################################

# CreateConversationGuideDraft Signature: create a draft of a conversation guide based on context

prompt_info_CreateConversationGuideDraft = get_prompt_info(
    "CreateConversationGuideDraft", df_prompts)
# print(prompt_info_CreateConversationGuideDraft)


class CreateConversationGuideDraft(dspy.Signature):

    context = dspy.InputField(
        desc=prompt_info_CreateConversationGuideDraft["input_descriptions"]["context"])
    title = dspy.OutputField(
        desc=prompt_info_CreateConversationGuideDraft["output_descriptions"]["title"])
    questions = dspy.OutputField(
        desc=prompt_info_CreateConversationGuideDraft["output_descriptions"]["questions"])


# set the signature description
CreateConversationGuideDraft.__doc__ = prompt_info_CreateConversationGuideDraft[
    "signature_description"]
# print(CreateConversationGuideDraft.__doc__)

#############################################################################################

# CreateInterviewDraft Signature: create a draft of an interview based on context

prompt_info_CreateInterviewDraft = get_prompt_info("CreateInterviewDraft", df_prompts)
# print(prompt_info_CreateInterviewDraft)


class CreateInterviewDraft(dspy.Signature):

    context = dspy.InputField(
        desc=prompt_info_CreateInterviewDraft["input_descriptions"]["context"])
    title = dspy.OutputField(
        desc=prompt_info_CreateInterviewDraft["output_descriptions"]["title"])
    questions = dspy.OutputField(
        desc=prompt_info_CreateInterviewDraft["output_descriptions"]["questions"])


# set the signature description
CreateInterviewDraft.__doc__ = prompt_info_CreateInterviewDraft["signature_description"]
# print(CreateInterviewDraft.__doc__)

#############################################################################################

# CreateSurveyDraft Signature: create a draft of a survey based on context

prompt_info_CreateSurveyDraft = get_prompt_info("CreateSurveyDraft", df_prompts)
# print(prompt_info_CreateSurveyDraft)


class CreateSurveyDraft(dspy.Signature):

    context = dspy.InputField(
        desc=prompt_info_CreateSurveyDraft["input_descriptions"]["context"])
    title = dspy.OutputField(
        desc=prompt_info_CreateSurveyDraft["output_descriptions"]["title"])
    questions = dspy.OutputField(
        desc=prompt_info_CreateSurveyDraft["output_descriptions"]["questions"])


# set the signature description
CreateSurveyDraft.__doc__ = prompt_info_CreateSurveyDraft["signature_description"]
# print(CreateSurveyDraft.__doc__)

#############################################################################################

# CreateDraftModule for Interview and Survey


class CreateDraftModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.interview_draft = dspy.Predict(CreateInterviewDraft)
        self.survey_draft = dspy.Predict(CreateSurveyDraft)
        self.conversation_guide_draft = dspy.Predict(
            CreateConversationGuideDraft)

    def forward(self, context, draft_type="interview", temp=0.7):

        if draft_type == "interview":
            output = self.interview_draft(
                context=context, config=dict(temperature=temp))
            # return the output as a dictionary
            return {"title": output.title, "sections": output.questions}
        elif draft_type == "survey":
            output = self.survey_draft(
                context=context, config=dict(temperature=temp))
            # return the output as a dictionary
            return {"title": output.title, "sections": output.questions}
        elif draft_type == "conversation_guide":
            output = self.conversation_guide_draft(
                context=context, config=dict(temperature=temp))
            # return the output as a dictionary
            return {"title": output.title, "sections": output.questions}
        else:
            raise ValueError(
                "Invalid draft type. Please choose either 'interview' or 'survey'.")
#############################################################################################

# DetectTopics Signature: detect topics from context


prompt_info_DetectTopics = get_prompt_info("DetectTopics", df_prompts)
# print(prompt_info_DetectTopics)


class DetectTopics(dspy.Signature):

    context = dspy.InputField(
        desc=prompt_info_DetectTopics["input_descriptions"]["context"])
    topics = dspy.OutputField(
        desc=prompt_info_DetectTopics["output_descriptions"]["topics"])


# set the signature description
DetectTopics.__doc__ = prompt_info_DetectTopics["signature_description"]
# print(DetectTopics.__doc__)

# DetectTopicsModule


class DetectTopicsModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.topics = dspy.ChainOfThought(DetectTopics)

    def forward(self, context, return_rationale=False, temp=0.7):

        output = self.topics(context=context,
                             config=dict(temperature=temp))

        if return_rationale:
            return {"topics": output.topics, "rationale": output.rationale}
        else:
            return {"topics": output.topics}

#############################################################################################

############################### DSPy for Analyze Topics ###############################

# ClassifyTopics Signature: classify topics for a question


prompt_info_ClassifyTopics = get_prompt_info("ClassifyTopics", df_prompts)
# print(prompt_info_ClassifyTopics)


class ClassifyTopics(dspy.Signature):

    question = dspy.InputField(
        desc=prompt_info_ClassifyTopics["input_descriptions"]["question"])
    all_topics = dspy.InputField(
        desc=prompt_info_ClassifyTopics["input_descriptions"]["all_topics"])
    pre_selected_topics = dspy.InputField(
        desc=prompt_info_ClassifyTopics["input_descriptions"]["pre_selected_topics"])
    classified_topics = dspy.OutputField(
        desc=prompt_info_ClassifyTopics["output_descriptions"]["classified_topics"])


# set the signature description
ClassifyTopics.__doc__ = prompt_info_ClassifyTopics["signature_description"]
# print(ClassifyTopics.__doc__)

# ClassifyTopicsModule


class ClassifyTopicsModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.classified_topics = dspy.Predict(ClassifyTopics)

    def forward(self, question, all_topics, pre_selected_topics, return_rationale=False, temp=0.7):

        output = self.classified_topics(question=question, all_topics=all_topics,
                                        pre_selected_topics=pre_selected_topics,
                                        config=dict(temperature=temp))

        return {"classified_topics": output.classified_topics}

#############################################################################################

# ClassifyQuestionType Signature: classify the question type


prompt_info_ClassifyQuestionType = get_prompt_info("ClassifyQuestionType", df_prompts)
# print(prompt_info_ClassifyQuestionType)


class ClassifyQuestionType(dspy.Signature):

    question = dspy.InputField(
        desc=prompt_info_ClassifyQuestionType["input_descriptions"]["question"])
    question_type = dspy.OutputField(
        desc=prompt_info_ClassifyQuestionType["output_descriptions"]["question_type"])


# set the signature description
ClassifyQuestionType.__doc__ = prompt_info_ClassifyQuestionType["signature_description"]
# print(ClassifyQuestionType.__doc__)

# ClassifyQuestionTypeModule


class ClassifyQuestionTypeModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.question_type = dspy.ChainOfThought(ClassifyQuestionType)

        self.load(f"{OPTIMIZED_MODULES_PATH}{prompt_info_ClassifyQuestionType['optimized_module']}")

    def forward(self, question, return_rationale=False, temp=0.7):

        output = self.question_type(question=question,
                                    config=dict(temperature=temp))

        if return_rationale:
            return {"question_type": output.question_type, "rationale": output.rationale}
        else:
            return {"question_type": output.question_type}

#############################################################################################

# AddQuestionsToTopic Signature: suggest new questions for a topic


prompt_info_AddQuestionsToTopic = get_prompt_info("AddQuestionsToTopic", df_prompts)
# print(prompt_info_AddQuestionsToTopic)


class AddQuestionsToTopic(dspy.Signature):

    context = dspy.InputField(
        desc=prompt_info_AddQuestionsToTopic["input_descriptions"]["context"])
    topic = dspy.InputField(
        desc=prompt_info_AddQuestionsToTopic["input_descriptions"]["topic"])
    existing_questions = dspy.InputField(
        desc=prompt_info_AddQuestionsToTopic["input_descriptions"]["existing_questions"])
    sections = dspy.InputField(
        desc=prompt_info_AddQuestionsToTopic["input_descriptions"]["sections"])
    additional_questions = dspy.OutputField(
        desc=prompt_info_AddQuestionsToTopic["output_descriptions"]["additional_questions"])


# set the signature description
AddQuestionsToTopic.__doc__ = prompt_info_AddQuestionsToTopic["signature_description"]
# print(AddQuestionsToTopic.__doc__)

# AddQuestionsToTopicModule


class AddQuestionsToTopicModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.additional_questions = dspy.Predict(AddQuestionsToTopic)

    def forward(self, context, topic, existing_questions, sections, return_rationale=False, temp=0.7):

        output = self.additional_questions(context=context,
                                           topic=topic,
                                           existing_questions=existing_questions,
                                           sections=sections,
                                           config=dict(temperature=temp))

        return {"additional_questions": output.additional_questions}

#############################################################################################

# RemoveQuestionsInTopic Signature: suggest questions to remove from a topic


prompt_info_RemoveQuestionsInTopic = get_prompt_info("RemoveQuestionsInTopic", df_prompts)
# print(prompt_info_RemoveQuestionsInTopic)


class RemoveQuestionsInTopic(dspy.Signature):

    context = dspy.InputField(
        desc=prompt_info_RemoveQuestionsInTopic["input_descriptions"]["context"])
    topic = dspy.InputField(
        desc=prompt_info_RemoveQuestionsInTopic["input_descriptions"]["topic"])
    number_of_questions_to_remove = dspy.InputField(
        desc=prompt_info_RemoveQuestionsInTopic["input_descriptions"]["number_of_questions_to_remove"])
    existing_questions = dspy.InputField(
        desc=prompt_info_RemoveQuestionsInTopic["input_descriptions"]["existing_questions"])
    questions_to_remove = dspy.OutputField(
        desc=prompt_info_RemoveQuestionsInTopic["output_descriptions"]["questions_to_remove"])


# set the signature description
RemoveQuestionsInTopic.__doc__ = prompt_info_RemoveQuestionsInTopic["signature_description"]
# print(RemoveQuestionsInTopic.__doc__)

# RemoveQuestionsInTopicModule


class RemoveQuestionsInTopicModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.questions_to_remove = dspy.Predict(RemoveQuestionsInTopic)

    def forward(self, context, topic, number_of_questions_to_remove, existing_questions, return_rationale=False, temp=0.7):

        output = self.questions_to_remove(context=context,
                                          topic=topic,
                                          number_of_questions_to_remove=number_of_questions_to_remove,
                                          existing_questions=existing_questions,
                                          config=dict(temperature=temp))

        return {"questions_to_remove": output.questions_to_remove}

#############################################################################################

############################### DSPy for Step 1 ###############################

# CheckPrompt Signature: check that the prompt is sufficient


prompt_info_CheckPrompt = get_prompt_info("CheckPrompt", df_prompts)


class CheckPrompt(dspy.Signature):

    context_question = dspy.InputField(
        desc=prompt_info_CheckPrompt["input_descriptions"]["context_question"])
    user_response = dspy.InputField(
        desc=prompt_info_CheckPrompt["input_descriptions"]["user_response"])
    advice = dspy.InputField(
        desc=prompt_info_CheckPrompt["input_descriptions"]["advice"])
    ignored_suggestions = dspy.InputField(
        desc=prompt_info_CheckPrompt["input_descriptions"]["ignored_suggestions"])

    inform_score = dspy.OutputField(
        desc=prompt_info_CheckPrompt["output_descriptions"]["inform_score"])
    suggestions = dspy.OutputField(
        desc=prompt_info_CheckPrompt["output_descriptions"]["suggestions"])


# set the signature description
CheckPrompt.__doc__ = prompt_info_CheckPrompt["signature_description"]
# print(AssessReadability.__doc__)

# CheckPromptModule


class CheckPromptModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.check_prompt = dspy.ChainOfThought(CheckPrompt)

    def forward(self, context_question, user_response, advice, ignored_suggestions, return_rationale=False, temp=0.7):

        output = self.check_prompt(context_question=context_question,
                                   user_response=user_response,
                                   advice=advice,
                                   ignored_suggestions=ignored_suggestions,

                                   config=dict(temperature=temp))
        # print(output)

        if return_rationale:
            return {"inform_score": output.inform_score,
                    "suggestions": output.suggestions,
                    "rationale": output.rationale}
        else:
            return {"inform_score": output.inform_score,
                    "suggestions": output.suggestions}

#############################################################################################

############################### DSPy for Generate Multiple Options ###############################

# RewordQuestionFromRequest Signature: generate an alternative question based on user's request


prompt_info_RewordQuestionFromRequest = get_prompt_info(
    "RewordQuestionFromRequest", df_prompts)
# print(prompt_info_RewordQuestionFromRequest)


class RewordQuestionFromRequest(dspy.Signature):

    context = dspy.InputField(
        desc=prompt_info_RewordQuestionFromRequest["input_descriptions"]["context"])
    existing_questions = dspy.InputField(
        desc=prompt_info_RewordQuestionFromRequest["input_descriptions"]["existing_questions"])
    question = dspy.InputField(
        desc=prompt_info_RewordQuestionFromRequest["input_descriptions"]["question"])
    # format = dspy.InputField(desc=prompt_info_RewordQuestionFromRequest["input_descriptions"]["format"])
    request = dspy.InputField(
        desc=prompt_info_RewordQuestionFromRequest["input_descriptions"]["request"])
    rewordings = dspy.OutputField(
        desc=prompt_info_RewordQuestionFromRequest["output_descriptions"]["rewordings"])


# set the signature description
RewordQuestionFromRequest.__doc__ = prompt_info_RewordQuestionFromRequest[
    "signature_description"]
# print(RewordQuestionFromRequest.__doc__)

# RewordQuestionFromRequestModule


class RewordQuestionFromRequestModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.rewordings = dspy.Predict(RewordQuestionFromRequest)

    def forward(self, question, context, existing_questions, request, return_rationale=False, temp=0.7):

        output = self.rewordings(
            context=context,
            existing_questions=existing_questions,
            question=question,
            request=request,
            config=dict(temperature=temp))

        # return the output as a dictionary
        return {"rewordings": output.rewordings}

#############################################################################################

# RewordQuestion Signature: generate an alternative wording for a question


prompt_info_RewordQuestion = get_prompt_info("RewordQuestion", df_prompts)
# print(prompt_info_RewordQuestion)


class RewordQuestion(dspy.Signature):

    context = dspy.InputField(
        desc=prompt_info_RewordQuestion["input_descriptions"]["context"])
    existing_questions = dspy.InputField(
        desc=prompt_info_RewordQuestion["input_descriptions"]["existing_questions"])
    question = dspy.InputField(
        desc=prompt_info_RewordQuestion["input_descriptions"]["question"])
    # format = dspy.InputField(desc=prompt_info_RewordQuestion["input_descriptions"]["format"])
    rewordings = dspy.OutputField(
        desc=prompt_info_RewordQuestion["output_descriptions"]["rewordings"])


# set the signature description
RewordQuestion.__doc__ = prompt_info_RewordQuestion["signature_description"]
# print(RewordQuestion.__doc__)

# RewordQuestionModule


class RewordQuestionModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.rewordings = dspy.Predict(RewordQuestion)

    def forward(self, context, question, existing_questions, return_rationale=False, temp=0.7):

        output = self.rewordings(context=context,
                                 existing_questions=existing_questions,
                                 question=question,
                                 config=dict(temperature=temp))

        # return the output as a dictionary
        return {"rewordings": output.rewordings}

#############################################################################################

############################### DSPy for Switching Response Format ###############################

# RewordQuestion Signature: generate an alternative wording for a question


prompt_info_SwitchResponseFormat = get_prompt_info("SwitchResponseFormat", df_prompts)
# print(prompt_info_SwitchResponseFormat)


class SwitchResponseFormat(dspy.Signature):

    question = dspy.InputField(
        desc=prompt_info_SwitchResponseFormat["input_descriptions"]["question"])
    new_question = dspy.OutputField(
        desc=prompt_info_SwitchResponseFormat["output_descriptions"]["new_question"])


# set the signature description
SwitchResponseFormat.__doc__ = prompt_info_SwitchResponseFormat["signature_description"]
# print(SwitchResponseFormat.__doc__)

# RewordQuestionModule


class SwitchResponseFormatModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.new_question = dspy.ChainOfThought(SwitchResponseFormat)

    def forward(self, question, return_rationale=False, temp=0.7):

        output = self.new_question(question=question,
                                   config=dict(temperature=temp))

        # return the output as a dictionary

        if return_rationale:
            return {"new_question": output.new_question, "rationale": output.rationale}
        else:
            return {"new_question": output.new_question}

#############################################################################################

############################### DSPy for Check Question ###############################

# AssessReadability Signature: assess readability of a question


prompt_info_AssessReadability = get_prompt_info("AssessReadability", df_prompts)
# print(prompt_info_AssessReadability)


class AssessReadability(dspy.Signature):

    question = dspy.InputField(
        desc=prompt_info_AssessReadability["input_descriptions"]["question"])
    reading_level = dspy.InputField(
        desc=prompt_info_AssessReadability["input_descriptions"]["reading_level"])
    readability = dspy.OutputField(
        desc=prompt_info_AssessReadability["output_descriptions"]["readability"])


# set the signature description
AssessReadability.__doc__ = prompt_info_AssessReadability["signature_description"]
# print(AssessReadability.__doc__)

# AssessReadabilityModule


class AssessReadabilityModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.readability = dspy.ChainOfThought(AssessReadability)

        self.load(f"{OPTIMIZED_MODULES_PATH}{prompt_info_AssessReadability['optimized_module']}")

    def forward(self, question, reading_level, return_rationale=False, temp=0.7):

        output = self.readability(question=question, reading_level=reading_level,
                                  config=dict(temperature=temp))

        # return the output as a dictionary

        if return_rationale:
            return {"score": output.readability, "rationale": output.rationale}
        else:
            return {"score": output.readability}

#############################################################################################

# AssessBias Signature: assess bias of a question


prompt_info_AssessBias = get_prompt_info("AssessBias", df_prompts)
# print(prompt_info_AssessBias)


class AssessBias(dspy.Signature):

    question = dspy.InputField(
        desc=prompt_info_AssessBias["input_descriptions"]["question"])
    bias = dspy.OutputField(
        desc=prompt_info_AssessBias["output_descriptions"]["bias"])


# set the signature description
AssessBias.__doc__ = prompt_info_AssessBias["signature_description"]
# print(AssessBias.__doc__)

# AssessBiasModule


class AssessBiasModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.bias = dspy.ChainOfThought(AssessBias)

        self.load(f"{OPTIMIZED_MODULES_PATH}{prompt_info_AssessBias['optimized_module']}")

    def forward(self, question, return_rationale=False, temp=0.7):

        output = self.bias(question=question,
                           config=dict(temperature=temp))

        # return the output as a dictionary

        if return_rationale:
            return {"score": output.bias, "rationale": output.rationale}
        else:
            return {"score": output.bias}

#############################################################################################

# AssessSpecificity Signature: assess specificity of a question


prompt_info_AssessSpecificity = get_prompt_info("AssessSpecificity", df_prompts)
# print(prompt_info_AssessSpecificity)


class AssessSpecificity(dspy.Signature):

    question = dspy.InputField(
        desc=prompt_info_AssessSpecificity["input_descriptions"]["question"])
    specificity = dspy.OutputField(
        desc=prompt_info_AssessSpecificity["output_descriptions"]["specificity"])


# set the signature description
AssessSpecificity.__doc__ = prompt_info_AssessSpecificity["signature_description"]
# print(AssessSpecificity.__doc__)

# AssessSpecificityModule


class AssessSpecificityModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.specificity = dspy.ChainOfThought(AssessSpecificity)

        self.load(f"{OPTIMIZED_MODULES_PATH}{prompt_info_AssessSpecificity['optimized_module']}")

    def forward(self, question, return_rationale=False, temp=0.7):

        output = self.specificity(question=question,
                                  config=dict(temperature=temp))

        # return the output as a dictionary

        if return_rationale:
            return {"score": output.specificity, "rationale": output.rationale}
        else:
            return {"score": output.specificity}

#############################################################################################

# CleanRationale Signature: clean rationale


prompt_info_CleanRationale = get_prompt_info("CleanRationale", df_prompts)
# print(prompt_info_CleanRationale)


class CleanRationale(dspy.Signature):

    question = dspy.InputField(
        desc=prompt_info_CleanRationale["input_descriptions"]["question"])
    problem = dspy.InputField(
        desc=prompt_info_CleanRationale["input_descriptions"]["problem"])
    input_rationale = dspy.InputField(
        desc=prompt_info_CleanRationale["input_descriptions"]["input_rationale"])
    new_rationale = dspy.OutputField(
        desc=prompt_info_CleanRationale["output_descriptions"]["new_rationale"])


# set the signature description
CleanRationale.__doc__ = prompt_info_CleanRationale["signature_description"]
# print(CleanRationale.__doc__)

# CleanRationaleModule


class CleanRationaleModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.new_rationale = dspy.ChainOfThought(CleanRationale)

    def forward(self, question, input_rationale, problem, return_rationale=False, temp=0.7):

        output = self.new_rationale(question=question,
                                    input_rationale=input_rationale,
                                    problem=problem,
                                    config=dict(temperature=temp))

        # return the output as a dictionary

        if return_rationale:
            return {"new_rationale": output.new_rationale, "rationale": output.rationale}
        else:
            return {"new_rationale": output.new_rationale}

#############################################################################################

# RewriteQuestion Signature: re-write question based on rationale


prompt_info_RewriteQuestion = get_prompt_info("RewriteQuestion", df_prompts)
# print(prompt_info_RewriteQuestion)


class RewriteQuestion(dspy.Signature):

    context = dspy.InputField(
        desc=prompt_info_RewriteQuestion["input_descriptions"]["context"])
    question = dspy.InputField(
        desc=prompt_info_RewriteQuestion["input_descriptions"]["question"])
    input_rationale = dspy.InputField(
        desc=prompt_info_RewriteQuestion["input_descriptions"]["input_rationale"])
    rewritten_questions = dspy.OutputField(
        desc=prompt_info_RewriteQuestion["output_descriptions"]["rewritten_questions"])


# set the signature description
RewriteQuestion.__doc__ = prompt_info_RewriteQuestion["signature_description"]
# print(RewriteQuestion.__doc__)

# RewriteQuestionModule


class RewriteQuestionModule(dspy.Module):
    def __init__(self):

        super().__init__()

        self.rewritten_questions = dspy.Predict(RewriteQuestion)

    def forward(self, context, question, input_rationale, return_rationale=False, temp=0.7):

        output = self.rewritten_questions(
            context=context,
            question=question,
            input_rationale=input_rationale,
            config=dict(temperature=temp))

        # return the output as a dictionary
        return {"rewritten_questions": output.rewritten_questions}

#############################################################################################

# function to clean scores from asess modules


def is_flagged(score, check_name):
    """
    score : score from the asess module
    check_name : name of the asess module

    return is_flagged : boolean indicating if the score is flagged
    """
    # get the flagged scores for the check
    flagged_scores = CHECKS[check_name]["flagged_scores"]

    # check if any of the flagged scores is present in the score
    if any([flagged_score in score.lower() for flagged_score in flagged_scores]):
        return True
    else:
        return False


def clean_scores(scores):
    """
    scores : dictionary mapping from check name to output of the asess module

    return cleaned_scores : dictionary mapping from flagged check name to rationales
    """
    cleaned_scores = {}

    for check_name in scores:
        score = scores[check_name]["score"]
        if is_flagged(score, check_name):
            cleaned_scores[check_name] = scores[check_name]["rationale"]

    return cleaned_scores


def get_flagged_checks(scores, initial_flags):
    """
    scores : dictionary mapping from check name to output of the asess module
    initial_flags: list of initial flags

    return flagged_checks : list of check names that are in initial_flags and not flagged in scores
                            also a list of check names that are flagged in scores
    """
    flagged_checks = {
        "fixed": [],
        "flagged": []
    }

    for check_name in scores:
        score = scores[check_name]["score"]
        if is_flagged(score, check_name):
            flagged_checks["flagged"].append(check_name)
        elif check_name in initial_flags:
            flagged_checks["fixed"].append(check_name)

    return flagged_checks


def format_cleaned_scores(cleaned_scores):
    """
    cleaned_scores : dictionary mapping from flagged check name to rationales
    """
    formatted_cleaned_scores = []
    for check_name in cleaned_scores:
        formatted_cleaned_scores.append({
            "check_type": check_name,
            "rationale": cleaned_scores[check_name]
        })

    return formatted_cleaned_scores

# CheckQuestionModule


class CheckQuestionModule(dspy.Module):
    def __init__(self):

        super().__init__()

        # create objects for all the asess modules
        self.assess_readability = AssessReadabilityModule()
        self.assess_bias = AssessBiasModule()
        self.assess_specificity = AssessSpecificityModule()

        # create object for the clean rationale module
        self.clean_rationale = CleanRationaleModule()

        # create object for the rewrite question module
        self.rewrite = RewriteQuestionModule()

    def run_assess_module(self, check_name, question_no_desc_str, reading_level, temp, outputs):
        """
        check_name : name of the check
        question_no_desc_str : question without the description field
        reading_level : reading level for the assess module
        temp : temperature for the asess module
        outputs : dictionary to store the output of the asess module
        """
        if check_name == "readability":
            output = self.assess_readability(question=question_no_desc_str,
                                             reading_level=reading_level,
                                             return_rationale=True,
                                             temp=temp)
        elif check_name == "bias":
            output = self.assess_bias(question=question_no_desc_str,
                                      return_rationale=True,
                                      temp=temp)
        elif check_name == "specificity":
            output = self.assess_specificity(question=question_no_desc_str,
                                             return_rationale=True,
                                             temp=temp)

        outputs[check_name] = output

    def run_clean_rationale(self, flagged_check, question_no_desc_str, rationale, problem, temp, cleaned_scores):
        """
        flagged_check : name of the flagged check
        question_no_desc_str : question without the description field
        rationale : rationale to clean
        problem : problem for the clean rationale module
        temp : temperature for the clean rationale module
        cleaned_scores : dictionary mapping from flagged check name to rationales
        """
        new_rationale = self.clean_rationale(question=question_no_desc_str,
                                             input_rationale=rationale,
                                             problem=problem,
                                             return_rationale=False,
                                             temp=temp)["new_rationale"]

        cleaned_scores[flagged_check] = new_rationale

    def forward(self, gpt4, checks_to_ignore, context, question, reading_level="third grade", temp=0.7):

        # question is now a JSON
        # clear the description field
        question_no_desc = question.copy()
        question_no_desc["description"] = ""

        # convert question_no_desc and question to strings
        question_str = json.dumps(question)
        question_no_desc_str = json.dumps(question_no_desc)

        # run the assess modules using multiple threads
        threads = list()
        outputs = dict()
        for check_name in CHECKS:
            if check_name in checks_to_ignore:
                continue
            thread = threading.Thread(target=self.run_assess_module,
                                      args=(check_name, question_no_desc_str, reading_level, temp, outputs))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        # print(f"Outputs from threads: {outputs}")

        # clean the scores
        cleaned_scores = clean_scores(outputs)

        # if no checks are flagged, return empty list
        if len(cleaned_scores) == 0:
            return {"rewritten_questions": "[\"empty\"]", "cleaned_scores": []}

        # print(f"Cleaned scores: {cleaned_scores}")

        # clean the rationales for each flagged check
        # run the clean rationale module in multiple threads
        threads = list()
        complete_rationale = ""
        for flagged_check, rationale in cleaned_scores.items():
            problem = CHECKS[flagged_check]["problem"]
            thread = threading.Thread(target=self.run_clean_rationale,
                                      args=(flagged_check, question_no_desc_str, rationale,
                                            problem, temp, cleaned_scores))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        # create the complete rationale
        for rationale in cleaned_scores.values():
            complete_rationale += rationale + " "

        # print(f"Cleaned scores: {cleaned_scores}")
        # print(f"Complete rationale: {complete_rationale}")

        # format the cleaned scores
        formatted_cleaned_scores = format_cleaned_scores(cleaned_scores)

        # print(f"Formatted cleaned scores: {formatted_cleaned_scores}")

        # rewrite the question with the complete rationale
        with dspy.context(lm=gpt4):
            rewritten_questions = self.rewrite(context=context,
                                               question=question_str,
                                               input_rationale=complete_rationale,
                                               return_rationale=False,
                                               temp=temp)["rewritten_questions"]

        return {"rewritten_questions": rewritten_questions, "cleaned_scores": formatted_cleaned_scores}

# AssessQuestionsModule

class AssessQuestionsModule(dspy.Module):
    def __init__(self):

        super().__init__()

        # create objects for all the asess modules
        self.assess_readability = AssessReadabilityModule()
        self.assess_bias = AssessBiasModule()
        self.assess_specificity = AssessSpecificityModule()

    def run_assess_module(self, check_name, question_index, question_no_desc_str, reading_level, temp, outputs):
        """
        check_name : name of the check
        question_no_desc_str : question without the description field
        reading_level : reading level for the assess module
        temp : temperature for the asess module
        outputs : dictionary to store the output of the asess module
        """
        if check_name == "readability":
            output = self.assess_readability(question=question_no_desc_str,
                                             reading_level=reading_level,
                                             return_rationale=True,
                                             temp=temp)
        elif check_name == "bias":
            output = self.assess_bias(question=question_no_desc_str,
                                      return_rationale=True,
                                      temp=temp)
        elif check_name == "specificity":
            output = self.assess_specificity(question=question_no_desc_str,
                                             return_rationale=True,
                                             temp=temp)
        if question_index not in outputs:
            outputs[question_index] = {}

        outputs[question_index][check_name] = output

    def forward(self, questions, initial_flags, reading_level="third grade", temp=0.7):

        # create a list to store the scores
        scores = []

        # use multithreading to run each check on each question
        threads = list()
        outputs = dict()

        for index, question in enumerate(questions):
            # question is now a JSON
            # clear the description field
            question_no_desc = question.copy()
            question_no_desc["description"] = ""

            # convert question_no_desc to a string
            question_no_desc_str = json.dumps(question_no_desc)

            for check_name in CHECKS:
                thread = threading.Thread(target=self.run_assess_module,
                                          args=(check_name, index, question_no_desc_str, reading_level, temp, outputs))
                threads.append(thread)
                thread.start()

        for thread in threads:
            thread.join()

        # go through the outputs and clean the scores
        for _index, score in outputs.items():
            cleaned_scores = get_flagged_checks(score, initial_flags)
            scores.append(cleaned_scores)
        
        return {"scores": scores}
